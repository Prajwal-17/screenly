import { DurableObject } from "cloudflare:workers";
import { getDB } from "../db/db";
import { messages } from "../db/schema";
import { CF_Bindings } from "../types/types";
import { LLM } from "./llm";
import { SpeechToText } from "./stt";
import { TextToSpeech } from "./tts";

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
  duration?: number;
};

export class InterviewSessionDO extends DurableObject<CF_Bindings> {
  ws: WebSocket | null = null;
  private db: ReturnType<typeof getDB>;

  sessionId: string | null = null;
  userId: string | null = null;

  attachment: { id: string } | null = null;
  messages: Message[] = [];

  private stt;
  private tts;
  private llm;

  constructor(ctx: DurableObjectState, env: CF_Bindings) {
    super(ctx, env);
    this.db = getDB(env);

    // TODO: get user details - prompts, settings etc .. & store in DO sqlite

    this.stt = new SpeechToText(env.XAI_API_KEY);
    this.tts = new TextToSpeech(env.XAI_API_KEY);
    this.llm = new LLM(env.OPENROUTER_API_KEY);
    this.messages = [];

    const sockets = this.ctx.getWebSockets();
    if (sockets.length > 0) {
      this.ws = sockets[0];
      this.attachment = this.ws.deserializeAttachment();
    }

    // auto response without using hibernated sockets
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  setWs(webSocket: WebSocket) {
    this.ws = webSocket;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Extract sessionId from path: /api/sessions/:id/ws
    this.sessionId = url.pathname.split("/").filter(Boolean).at(2) ?? null;
    // this.userId = url.searchParams.get("userId");

    // Seed system prompt once — before any user message arrives
    this.messages.push({
      role: "system",
      content:
        "You are an expert interviewer. Conduct a professional, structured, one-question-at-a-time interview. Maintain a neutral, encouraging tone, listen actively to answers, and probe for details using the STAR method. Do not break character, do not provide evaluations during the session, and adapt your complexity to the candidate's level. Start by asking for the target role.",
    });

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.setWs(server);
    this.ctx.acceptWebSocket(server);

    const id = crypto.randomUUID();

    server.serializeAttachment({ id });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    try {
      // Handle text messages (interrupts, control signals from frontend)
      // if (typeof message === "string") {
      //   const data = JSON.parse(message);
      //   if (data.type === "interrupt") {
      //     this.tts.stop();
      //   }
      //   return;
      // }

      if (!this.sessionId) {
        console.log("sessionid", this.sessionId);
        return;
      }

      const audio = message as ArrayBuffer;
      console.log("audio", audio);
      const transcribeResponse = await this.stt.transcribe(audio);

      if (!transcribeResponse) {
        return;
      }

      await this.db
        .insert(messages)
        .values({
          sessionId: this.sessionId,
          role: "user",
          content: transcribeResponse.text ?? "",
        })
        .run();

      this.messages.push({
        role: "user",
        content: transcribeResponse.text,
        duration: transcribeResponse.duration,
      });

      const llmResponse = await this.llm.generate(this.messages);

      if (!llmResponse?.content) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "LLM returned empty response",
          }),
        );
        return;
      }

      await this.db
        .insert(messages)
        .values({
          id: crypto.randomUUID(),
          sessionId: this.sessionId,
          role: "assistant",
          content: llmResponse.content,
        })
        .run();

      this.messages.push({
        role: "assistant",
        content: llmResponse.content,
      });

      const audioBuffer = await this.tts.speak(llmResponse.content);

      ws.send(audioBuffer as ArrayBuffer);
    } catch (err) {
      console.error("[InterviewSessionDO] error:", err);
      ws.send(JSON.stringify({ type: "error", message: "Internal error" }));
    }
  }

  // webSocketClose(
  //   ws: WebSocket,
  //   code: number,
  //   reason: string,
  //   wasClean: boolean,
  // ): void | Promise<void> {}
}
