import { DurableObject } from "cloudflare:workers";
import { clientEventSchema } from "@repo/shared";
import { readConfig, getCapabilities } from "./config";
import { createDB } from "./db";
import { createInterviews } from "./db/interviews";
import { InterviewSession } from "./lib/interviewSession";
import { generateFeedback } from "./lib/feedbackService";
import { LLMService } from "./lib/llmService";
import { STTService } from "./lib/sttService";
import { TTSService } from "./lib/ttsService";

export class InterviewRoom extends DurableObject<Env> {
  private session: InterviewSession | null = null;
  private socket: WebSocket | null = null;
  private connecting = false;
  private config() {
    return readConfig(this.env);
  }
  private store() {
    return createInterviews(createDB(this.env.DB));
  }
  private background(task: Promise<unknown>) {
    this.ctx.waitUntil(
      task.catch((error) => {
        console.error(
          JSON.stringify({
            event: "interview_error",
            message: error instanceof Error ? error.message : "Unknown error",
          }),
        );
        if (this.socket?.readyState === WebSocket.OPEN)
          this.socket.send(
            JSON.stringify({
              type: "error",
              scope: "session",
              message: "The interview connection failed. Please reconnect.",
            }),
          );
      }),
    );
  }
  async fetch(request: Request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      return new Response("WebSocket upgrade required", { status: 426 });
    const id = new URL(request.url).pathname.split("/").at(-2)!;
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.binaryType = "arraybuffer";
    server.accept();
    if (this.socket || this.connecting) {
      server.send(
        JSON.stringify({
          type: "error",
          scope: "session",
          message:
            "This interview is open in another tab. Close it and reconnect.",
        }),
      );
      server.close(1008, "Interview already connected");
      return new Response(null, { status: 101, webSocket: client });
    }
    this.connecting = true;
    try {
      await this.ctx.storage.put("interviewId", id);
      const config = this.config();
      this.socket = server;
      const session = new InterviewSession(
        id,
        (event) => {
          if (server.readyState === WebSocket.OPEN)
            server.send(
              event instanceof Uint8Array ? event : JSON.stringify(event),
            );
        },
        {
          store: this.store(),
          speechEnabled: getCapabilities(config).voice,
          reply: (interview, signal) =>
            new LLMService(config).generateReply(interview, signal),
          openingReply: (interview, signal) =>
            new LLMService(config).openingReply(interview, signal),
          feedback: (id) => this.queueFeedback(id),
          stt: (turn, error, topics) =>
            new STTService(config, turn, error, topics),
          tts: (audio) => new TTSService(config, audio),
          background: (task) => this.background(task),
          scheduleDeadline: async (deadline) => {
            await this.ctx.storage.put("deadline", deadline);
            await this.ctx.storage.setAlarm(deadline);
          },
          cancelDeadline: () => this.cancelDeadline(),
        },
      );
      this.session = session;
      server.addEventListener("message", (event) => {
        if (typeof event.data === "string") {
          if (event.data.length > 65536) {
            server.close(1009, "Message too large");
            return;
          }
          let data: unknown;
          try {
            data = JSON.parse(event.data);
          } catch {
            return;
          }
          const parsed = clientEventSchema.safeParse(data);
          if (parsed.success) this.background(session.handle(parsed.data));
        } else if (
          event.data instanceof ArrayBuffer &&
          event.data.byteLength <= 64000
        )
          session.audio(new Uint8Array(event.data));
      });
      const close = () => {
        if (this.session === session) {
          this.socket = null;
          this.session = null;
        }
        this.background(session.close());
      };
      server.addEventListener("close", close);
      server.addEventListener("error", close);
      this.background(session.ready());
      return new Response(null, { status: 101, webSocket: client });
    } finally {
      this.connecting = false;
    }
  }
  async closeSession() {
    const session = this.session;
    this.session = null;
    this.socket?.close(1000, "Interview closed");
    this.socket = null;
    await session?.close();
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }
  private async cancelDeadline() {
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.delete(["deadline", "feedbackPending"]);
  }
  async finish(id: string, generateFeedback = true) {
    if (this.session) await this.session.finish(generateFeedback);
    else {
      const interview = await this.store().get(id);
      if (interview?.status === "active")
        await this.store().finish(id, generateFeedback);
      const saved = await this.store().get(id);
      if (saved?.feedbackStatus === "skipped") await this.cancelDeadline();
      else await this.queueFeedback(id);
    }
  }
  async queueFeedback(id: string, allowSkipped = false) {
    const interview = await this.store().get(id);
    if (
      !interview ||
      interview.status !== "completed" ||
      interview.feedbackStatus === "ready" ||
      (interview.feedbackStatus === "skipped" && !allowSkipped)
    )
      return;
    // Expose the queued state before returning so feedback polling starts immediately.
    await this.store().feedbackState(id, "generating");
    await this.ctx.storage.put("interviewId", id);
    await this.ctx.storage.delete("deadline");
    await this.ctx.storage.put("feedbackPending", true);
    await this.ctx.storage.setAlarm(Date.now() + 1);
  }
  async alarm() {
    const id = await this.ctx.storage.get<string>("interviewId");
    if (!id) return;
    const deadline = await this.ctx.storage.get<number>("deadline");
    if (deadline && deadline <= Date.now()) {
      const interview = await this.store().get(id);
      if (interview?.pausedAt != null)
        await this.ctx.storage.delete("deadline");
      else await this.finish(id);
    }
    if (await this.ctx.storage.get<boolean>("feedbackPending")) {
      await generateFeedback(id, this.store(), this.config());
      await this.ctx.storage.delete("feedbackPending");
    }
  }
}
