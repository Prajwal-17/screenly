import { Session, User } from "better-auth";
import { DurableObject } from "cloudflare:workers";
import { asc, eq } from "drizzle-orm";
import { drizzle, DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { v4 as uuid } from "uuid";
import migrations from "../../drizzle-do/migrations";
import { getAuth } from "../auth/auth";
import { getDB } from "../db/db";
import { messages as doMessages, interviewSession } from "../db/do-schema";
import { CF_Bindings } from "../types/types";
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
        console.log("url", ws.url);
        console.log("msg", message);
        ws.send("fine");
        return;
      }

      const audio = message as ArrayBuffer;

      console.log(audio);
      // store audio to r2 - for debugging
      const audioFilename = `debug-audio-${new Date().toLocaleTimeString().replace(/\s/g, "-").replace(/:/g, "-")}.webm`;
      this.env.MEDIA_BUCKET.put(audioFilename, audio);

      // throw new Error("Error");
      const transcribeResponse = await this.stt.transcribe(audio);

      if (!transcribeResponse) {
        return;
      }

      await this.db.insert(doMessages).values({
        interviewSessionId: sessionId,
        role: "user",
        content: transcribeResponse.text ?? "",
      });

      const history = await this.db
        .select({ role: doMessages.role, content: doMessages.content })
        .from(doMessages)
        .where(eq(doMessages.interviewSessionId, sessionId))
        .orderBy(asc(doMessages.createdAt));

      this.messages = [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

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

      await this.db.insert(doMessages).values({
        interviewSessionId: sessionId,
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
