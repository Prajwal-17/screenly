import { DurableObject } from "cloudflare:workers";
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
  // sessionId: string;
  ws: WebSocket | null = null;
  attachment: { id: string } | null = null;
  messages: Message[] = [];

  private stt;
  private tts;
  private llm;

  constructor(ctx: DurableObjectState, env: CF_Bindings) {
    super(ctx, env);

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
    console.log(message);

    // this.buffer?.push(message as ArrayBuffer);
    // if type = "string " then use switch case else send array buffer

    const audio = message as ArrayBuffer;
    const transcribeResponse = await this.stt.transcribe(audio);

    this.messages.push({
      role: "user",
      content: transcribeResponse?.text ?? "",
      duration: transcribeResponse?.duration,
    });

    if (this.messages.length <= 0) {
      throw new Error("Error occured in messages");
    }

    // TODO - inject system prompt dynamically
    this.messages.unshift({
      role: "system",
      content:
        "You are an expert interviewer. Conduct a professional, structured, one-question-at-a-time interview. Maintain a neutral, encouraging tone, listen actively to answers, and probe for details using the STAR method. Do not break character, do not provide evaluations during the session, and adapt your complexity to the candidate's level. Start by asking for the target role.",
    });

    const llmResponse = await this.llm.generate(this.messages);

    this.messages.push({
      role: "assistant",
      content: llmResponse?.content ?? "",
    });

    const lastMessage = this.messages.at(-1)!;
    const audioBuffer = await this.tts.speak(lastMessage.content);

    ws.send(audioBuffer as ArrayBuffer);
  }

  // webSocketClose(
  //   ws: WebSocket,
  //   code: number,
  //   reason: string,
  //   wasClean: boolean,
  // ): void | Promise<void> {}
}
