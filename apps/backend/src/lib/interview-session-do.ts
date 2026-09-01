import { Session, User } from "better-auth";
import { DurableObject } from "cloudflare:workers";
import { asc, eq } from "drizzle-orm";
import { drizzle, DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { v4 as uuid } from "uuid";
import migrations from "../../drizzle-do/migrations";
import { getAuth } from "../auth/auth";
import { getDB } from "../db/db";
import { interviewSession, messages } from "../db/do-schema";
import { CF_Bindings } from "../types/types";
import { GrokSttStream, STREAM_EVENTS } from "./grok-stt-stream";
import { LLM } from "./llm";
import { SpeechToText } from "./stt";
import { systemPrompt } from "./system-prompt";
import { TextToSpeech } from "./tts";

export type Attachment = {
  id: string;
  userId: string;
  interviewSessionId: string;
};

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
  duration?: number;
};

export class InterviewSessionDO extends DurableObject<CF_Bindings> {
  private ws: WebSocket | null = null;
  storage: DurableObjectStorage;
  db: DrizzleSqliteDODatabase;

  private user!: User;
  private session!: Session;

  private _attachment: Attachment | null = null;
  private d1: ReturnType<typeof getDB>;

  messages: Message[] = [];

  private stt;
  private tts;
  private llm;
  private grokSttStream: GrokSttStream | null = null;
  private utteranceText = "";
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: DurableObjectState, env: CF_Bindings) {
    super(ctx, env);
    this.storage = ctx.storage;
    this.db = drizzle(this.storage, { logger: false }); // durable object
    this.d1 = getDB(env); // cloudflare D1

    this.stt = new SpeechToText(env.XAI_API_KEY);
    this.tts = new TextToSpeech(env.XAI_API_KEY);
    this.llm = new LLM(env.OPENROUTER_API_KEY);
    this.messages = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    ctx.blockConcurrencyWhile(async () => {
      await this._migrate();
    });

    const sockets = this.ctx.getWebSockets();
    if (sockets.length > 0) {
      this.ws = sockets[0];
      const data = this.ws.deserializeAttachment() as Attachment | null;
      if (data) {
        this._attachment = data;
      }
    }

    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  private get attachment(): Attachment {
    if (!this._attachment) {
      throw new Error("Attachment not initialized");
    }
    return this._attachment;
  }

  get interviewSessionId(): string {
    return this.attachment.interviewSessionId;
  }

  setWs(webSocket: WebSocket) {
    this.ws = webSocket;
  }

  setUser(user: User) {
    this.user = user;
  }

  setSession(session: Session) {
    this.session = session;
  }

  private setAttachment(data: Attachment) {
    this._attachment = data;
    if (this.ws) {
      this.ws.serializeAttachment(data);
    }
  }

  // grokstream uses cf fetch to connect to a socket url
  // need to await until it connects to the grok server
  private async _ensureGrokStream(ws: WebSocket) {
    if (this.grokSttStream) return;

    const stream = new GrokSttStream(this.env.XAI_API_KEY);

    stream.on(STREAM_EVENTS.READY, () => {
      console.log("Grok STT Ready");
    });

    stream.on(STREAM_EVENTS.TRANSCRIPT, (msg: any) => {
      ws.send(JSON.stringify({ type: "transcript", text: msg.text }));
    });

    stream.on(STREAM_EVENTS.CHUNK_FINAL, (msg: any) => {
      if (!msg.text) return;

      this.utteranceText = this.utteranceText
        ? this.utteranceText + " " + msg.text
        : msg.text;

      this._resetFlushTimer(ws);

      ws.send(
        JSON.stringify({ type: "utterance", text: this.utteranceText }),
      );
    });

    stream.on(STREAM_EVENTS.UTTERANCE_FINAL, (msg: any) => {
      if (!msg.text) return;
      console.log("utterance final:", msg.text);

      this.utteranceText = this.utteranceText
        ? this.utteranceText + " " + msg.text
        : msg.text;

      this._resetFlushTimer(ws);

      ws.send(
        JSON.stringify({ type: "utterance", text: this.utteranceText }),
      );
    });

    stream.on("error", (err: any) => {
      console.error("grok stream error:", err);
    });

    await stream.connect();
    this.grokSttStream = stream;
  }

  private _resetFlushTimer(ws: WebSocket) {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushUtterance(ws);
    }, 2000);
  }

  private async flushUtterance(ws: WebSocket) {
    if (!this.utteranceText) return;

    const fullText = this.utteranceText;
    this.utteranceText = "";

    console.log("flushing utterance:", fullText);

    const sessionId = this.attachment.interviewSessionId;

    // 1. insert merged user message
    await this.db.insert(messages).values({
      interviewSessionId: sessionId,
      role: "user",
      content: fullText,
    });

    // 2. rebuild LLM context
    const history = await this.db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.interviewSessionId, sessionId))
      .orderBy(asc(messages.createdAt));

    this.messages = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // 3. LLM
    const llmResponse = await this.llm.generate(this.messages);
    if (!llmResponse?.content) return;

    // 4. insert assistant response
    await this.db.insert(messages).values({
      interviewSessionId: sessionId,
      role: "assistant",
      content: llmResponse.content,
    });

    this.messages.push({
      role: "assistant",
      content: llmResponse.content,
    });

    // 5. TTS + send audio
    const audioBuffer = await this.tts.speak(llmResponse.content);
    ws.send(audioBuffer as ArrayBuffer);
  }

  async _migrate() {
    migrate(this.db, migrations);
  }

  async fetch(request: Request): Promise<Response> {
    const auth = getAuth(this.env);
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session || !session.user || !session.session) {
      return new Response("Unauthorized", { status: 401 });
    }

    this.setUser(session.user);
    this.setSession(session.session);

    // TODO: get user details - prompts, settings etc .. & store in DO sqlite
    // get user's custom settings in fetch not in constructor - since fetch runs when req hits DO

    // this.messages.push({
    //   role: "system",
    //   content: systemPrompt,
    // });

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.setWs(server);
    this.ctx.acceptWebSocket(server);

    const id = uuid();

    const [sessionRecord] = await this.db
      .insert(interviewSession)
      .values({
        userId: this.user.id,
      })
      .returning();

    this.setAttachment({
      id,
      userId: session.user.id,
      interviewSessionId: sessionRecord.id,
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    const sessionId = this._attachment?.interviewSessionId;
    if (!sessionId) {
      console.log("InterviewSessionId not set yet, skipping message");
      return;
    }

    try {
      if (typeof message === "string") {
        try {
          const parsed = JSON.parse(message);
          if (parsed.type === "utterance-end") {
            await this.flushUtterance(ws);
          }
        } catch {
          // ignore unparseable strings
        }
        return;
      }

      const audio = message as ArrayBuffer;

      await this._ensureGrokStream(ws);

      this.grokSttStream?.sendAudio(audio);
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
