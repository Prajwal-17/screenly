import { Session, User } from "better-auth";
import { DurableObject } from "cloudflare:workers";
import { drizzle, DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { v4 as uuid } from "uuid";
import migrations from "../../drizzle-do/migrations";
import { getAuth } from "../auth/auth";
import { getDB } from "../db/db";
import { interviewSession } from "../db/do-schema";
import { CF_Bindings } from "../types/types";
import { GrokSttStream } from "./grok-stt-stream";
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

  constructor(ctx: DurableObjectState, env: CF_Bindings) {
    super(ctx, env);
    this.storage = ctx.storage;
    this.db = drizzle(this.storage, { logger: false });
    this.d1 = getDB(env);

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

    stream.on("transcript", (msg: any) => {
      console.log("transcript from grok:", msg.transcript);
      ws.send(JSON.stringify({ type: "transcript", text: msg.transcript }));
    });

    stream.on("error", (err: any) => {
      console.error("grok stream error:", err);
    });

    await stream.connect();
    this.grokSttStream = stream;
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
      console.log("interviewSessionId not set yet, skipping message");
      return;
    }

    try {
      if (typeof message === "string") {
        console.log("ws string msg:", message);
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
