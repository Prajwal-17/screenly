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
import { DeepgramCredentials } from "./lib/deepgramCredentials";

export class InterviewRoom extends DurableObject<Env> {
  private session: InterviewSession | null = null;
  private socket: WebSocket | null = null;
  private connecting = false;
  private alarmTask: Promise<void> = Promise.resolve();
  private credentials = new DeepgramCredentials(
    this.config(),
    this.ctx.storage,
    () => this.scheduleAlarm(),
  );
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
      const key = () => this.credentials.get(id);
      // Provider services never receive the management key as a fallback.
      const voiceConfig = { ...config, DEEPGRAM_API_KEY: undefined };
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
            new STTService(voiceConfig, turn, error, topics, undefined, key),
          tts: (audio) => new TTSService(voiceConfig, audio, undefined, key),
          background: (task) => this.background(task),
          scheduleDeadline: async (deadline) => {
            await this.ctx.storage.put("deadline", deadline);
            await this.scheduleAlarm();
          },
          cancelDeadline: () => this.cancelDeadline(),
          closeVoice: () => this.closeVoice(),
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
    await this.credentials.close();
    // Keep credential tombstones and pending revocations after deletion.
    await this.ctx.storage.delete([
      "interviewId",
      "deadline",
      "feedbackPending",
    ]);
    await this.scheduleAlarm();
  }
  private scheduleAlarm(): Promise<void> {
    // One alarm services all durable work. Serialize rescheduling so a pause
    // or feedback update cannot accidentally cancel a revocation retry.
    const task = this.alarmTask.then(async () => {
      const [deadline, feedback, credential] = await Promise.all([
        this.ctx.storage.get<number>("deadline"),
        this.ctx.storage.get<boolean>("feedbackPending"),
        this.credentials.nextAlarm(),
      ]);
      const times = [
        deadline,
        feedback ? Date.now() + 1 : null,
        credential,
      ].filter((time): time is number => time != null);
      if (times.length) await this.ctx.storage.setAlarm(Math.min(...times));
      else await this.ctx.storage.deleteAlarm();
    });
    this.alarmTask = task.catch(() => {});
    return task;
  }
  private async cancelDeadline() {
    await this.ctx.storage.delete(["deadline", "feedbackPending"]);
    await this.scheduleAlarm();
  }
  private async closeVoice() {
    await this.ctx.storage.delete("deadline");
    await this.credentials.close();
  }
  async finish(id: string, generateFeedback = true) {
    if (this.session) await this.session.finish(generateFeedback);
    else {
      const interview = await this.store().get(id);
      if (interview?.status === "active")
        await this.store().finish(id, generateFeedback);
      await this.closeVoice();
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
    await this.scheduleAlarm();
  }
  async alarm() {
    // Revocation still runs when the interview has been deleted from D1.
    await this.credentials.alarm();
    const id = await this.ctx.storage.get<string>("interviewId");
    if (!id) {
      await this.scheduleAlarm();
      return;
    }
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
    await this.scheduleAlarm();
  }
}
