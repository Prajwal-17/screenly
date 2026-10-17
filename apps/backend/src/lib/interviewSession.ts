import {
  packAudio,
  type ClientEvent,
  type InterviewDetail,
  type ServerEvent,
} from "@repo/shared";
import type { ListenV2TurnInfo } from "@deepgram/sdk/listen";
import { capabilities } from "../config";
import { interviews } from "../db/interviews";
import { generateFeedback } from "./feedbackService";
import { LLMService } from "./llmService";
import { STTService } from "./sttService";
import { DeepgramConnectionError } from "./deepgramSocket";
import { TTSService } from "./ttsService";

export type SessionDependencies = {
  store: typeof interviews;
  speechEnabled: boolean;
  reply: (
    interview: InterviewDetail,
    signal: AbortSignal,
  ) => AsyncGenerator<string>;
  feedback: (id: string) => Promise<void>;
  stt: (
    turn: (event: ListenV2TurnInfo) => void,
    error: (error: Error) => void,
  ) => Pick<STTService, "connect" | "sendAudio" | "close">;
  tts: (
    audio: (data: Uint8Array) => void,
  ) => Pick<TTSService, "connect" | "sendText" | "flush" | "close">;
};
const defaults: SessionDependencies = {
  store: interviews,
  speechEnabled: capabilities.voice,
  reply: (interview, signal) =>
    new LLMService().generateReply(interview, signal),
  feedback: generateFeedback,
  stt: (turn, error) => new STTService(turn, error),
  tts: (audio) => new TTSService(audio),
};

export class InterviewSession {
  private closed = false;
  private finishing = false;
  private voice = false;
  private starting = false;
  private stt: ReturnType<SessionDependencies["stt"]> | null = null;
  private tts: ReturnType<SessionDependencies["tts"]> | null = null;
  private responseId = 0;
  private playback: { id: number; messageId: string | null } | null = null;
  private current: {
    id: number;
    text: string;
    controller: AbortController;
    saved: boolean;
    savedId: string | null;
  } | null = null;
  private deadline: ReturnType<typeof setTimeout> | null = null;
  private readonly connectionId = crypto.randomUUID();

  constructor(
    readonly id: string,
    private send: (event: ServerEvent | Uint8Array) => void,
    private deps: SessionDependencies = defaults,
  ) {}
  ready() {
    this.send({ type: "ready", interview: this.deps.store.get(this.id)! });
  }
  async handle(event: ClientEvent) {
    if (this.closed || this.finishing) return;
    if (event.type === "finish") {
      await this.finish();
      return;
    }
    if (event.type === "interrupt") {
      this.interrupt();
      return;
    }
    if (event.type === "played") {
      if (this.playback?.id === event.responseId) this.playback = null;
      return;
    }
    if (event.type === "speak") {
      await this.speakLatest();
      return;
    }
    if (event.type === "start") {
      await this.start();
      return;
    }
  }
  audio(data: Uint8Array) {
    if (!this.closed && this.voice && !this.finishing)
      this.stt?.sendAudio(data);
  }
  private async start() {
    if (this.starting || this.deps.store.get(this.id)?.status === "completed")
      return;
    this.starting = true;
    try {
      if (!this.stt) {
        this.stt = this.deps.stt(
          (event) => this.turn(event),
          (error) => this.voiceError(error),
        );
        try {
          await this.stt.connect();
          this.voice = true;
        } catch (error) {
          this.voiceError(error);
          return;
        }
      }
      if (this.closed || this.finishing) return;
      const interview = this.deps.store.start(this.id);
      if (!this.deadline) {
        const remaining =
          interview.duration * 60000 - (Date.now() - interview.startedAt!);
        if (remaining <= 0) {
          await this.finish();
          return;
        }
        this.deadline = setTimeout(() => {
          void this.finish();
        }, remaining);
      }
      this.send({ type: "ready", interview });
      if (
        !interview.messages.length ||
        interview.messages.at(-1)?.role === "user" ||
        interview.messages.at(-1)?.status === "interrupted"
      )
        await this.reply();
      else if (this.deps.speechEnabled) await this.speakLatest();
      else this.send({ type: "status", status: "listening" });
    } finally {
      this.starting = false;
    }
  }
  private turn(event: ListenV2TurnInfo) {
    if (
      this.closed ||
      this.finishing ||
      !this.voice ||
      this.deps.store.get(this.id)?.status !== "active"
    )
      return;
    if (event.event === "StartOfTurn") this.interrupt();
    this.send({ type: "partial", text: event.transcript });
    if (event.event === "EndOfTurn" && event.transcript.trim()) {
      const key = `stt:${this.connectionId}:${event.turn_index}`;
      if (this.deps.store.hasMessageSource(this.id, key)) return;
      this.interrupt();
      const message = this.deps.store.addMessage(
        this.id,
        "user",
        event.transcript,
        key,
      );
      if (!message) return;
      this.send({ type: "partial", text: "" });
      this.send({ type: "message", message });
      void this.reply();
    }
  }
  interrupt() {
    if (this.playback) {
      const message = this.playback.messageId
        ? this.deps.store.interruptMessage(this.playback.messageId)
        : undefined;
      if (message && !this.closed) this.send({ type: "message", message });
      this.send({ type: "interrupted", responseId: this.playback.id });
      this.playback = null;
    }
    const current = this.current;
    if (!current) return;
    current.controller.abort();
    this.persist(current, "interrupted");
    if (current.savedId) {
      const message = this.deps.store.interruptMessage(current.savedId);
      if (message && !this.closed) this.send({ type: "message", message });
    }
    this.tts?.close();
    this.tts = null;
    this.current = null;
    this.send({ type: "interrupted", responseId: current.id });
    this.send({ type: "status", status: "listening" });
  }
  private persist(
    current: NonNullable<InterviewSession["current"]>,
    status: "complete" | "interrupted",
  ) {
    if (current.saved || !current.text.trim()) return;
    current.saved = true;
    const message = this.deps.store.addMessage(
      this.id,
      "assistant",
      current.text.trim(),
      `assistant:${this.connectionId}:${current.id}`,
      status,
    );
    current.savedId = message?.id ?? null;
    if (message && !this.closed) this.send({ type: "message", message });
  }
  private async reply() {
    if (this.closed || this.finishing || this.current) return;
    const current = {
      id: ++this.responseId,
      text: "",
      controller: new AbortController(),
      saved: false,
      savedId: null as string | null,
    };
    this.current = current;
    this.send({ type: "status", status: "thinking" });
    const speech = this.deps.speechEnabled
      ? this.deps.tts((audio) => {
          if (
            !this.closed &&
            this.current === current &&
            !current.controller.signal.aborted
          )
            this.send(packAudio(current.id, audio));
        })
      : null;
    this.tts = speech;
    let speechFailed = false;
    const speechReady = speech
      ?.connect()
      .then(() => {
        if (this.current !== current || this.closed) {
          speech.close();
          return false;
        }
        this.send({ type: "audio-start", responseId: current.id });
        return true;
      })
      .catch((error) => {
        speechFailed = true;
        if (this.current === current) this.speechError(error);
        return false;
      });
    let buffer = "";
    try {
      for await (const text of this.deps.reply(
        this.deps.store.get(this.id)!,
        current.controller.signal,
      )) {
        if (current.controller.signal.aborted || this.closed) return;
        current.text += text;
        buffer += text;
        this.send({ type: "delta", responseId: current.id, text });
        if (speech && (/[.!?]\s*$/.test(buffer) || buffer.length >= 180)) {
          if (await speechReady) {
            this.send({ type: "status", status: "speaking" });
            speech.sendText(buffer);
          }
          buffer = "";
        }
      }
      if (current.controller.signal.aborted || this.closed) return;
      if (!current.text.trim())
        throw new Error("The interviewer returned an empty response.");
      this.persist(current, "complete");
      if (speech && (await speechReady)) {
        try {
          if (buffer) speech.sendText(buffer);
          await speech.flush();
          if (current.savedId && !current.controller.signal.aborted)
            this.playback = { id: current.id, messageId: current.savedId };
        } catch (error) {
          if (!current.controller.signal.aborted) this.speechError(error);
        }
      }
    } catch {
      if (!current.controller.signal.aborted && !this.closed) {
        this.persist(current, "interrupted");
        this.send({
          type: "error",
          scope: speechFailed ? "speech" : "llm",
          message: speechFailed
            ? "Speech is unavailable. Check the Deepgram key and model, then retry speech."
            : "The interviewer could not respond. Retry the interviewer or speak another answer.",
        });
      }
    } finally {
      speech?.close();
      if (this.current === current) {
        this.current = null;
        this.tts = null;
        if (!this.closed) {
          this.send({ type: "audio-end", responseId: current.id });
          this.send({ type: "status", status: "listening" });
        }
      }
    }
  }
  private speechError(error?: unknown) {
    if (!this.closed)
      this.send({
        type: "error",
        scope: "speech",
        message:
          error instanceof DeepgramConnectionError
            ? error.message
            : "Speech playback failed. Check the backend Deepgram API key and voice model, then retry speech.",
      });
  }
  private async speakLatest() {
    const interview = this.deps.store.get(this.id);
    const message = interview?.messages
      .filter((item) => item.role === "assistant")
      .at(-1);
    if (interview?.status !== "active" || !message || this.closed) return;
    if (!this.deps.speechEnabled) {
      this.speechError();
      return;
    }
    this.interrupt();
    const current = {
      id: ++this.responseId,
      text: "",
      controller: new AbortController(),
      saved: true,
      savedId: null as string | null,
    };
    this.current = current;
    const speech = this.deps.tts((audio) => {
      if (
        !this.closed &&
        this.current === current &&
        !current.controller.signal.aborted
      )
        this.send(packAudio(current.id, audio));
    });
    this.tts = speech;
    try {
      await speech.connect();
      if (this.current !== current || this.closed) return;
      this.send({ type: "audio-start", responseId: current.id });
      this.send({ type: "status", status: "speaking" });
      speech.sendText(message.content);
      await speech.flush();
      if (!current.controller.signal.aborted)
        this.playback = { id: current.id, messageId: null };
    } catch (error) {
      if (!current.controller.signal.aborted) this.speechError(error);
    } finally {
      speech.close();
      if (this.current === current) {
        this.current = null;
        this.tts = null;
        if (!this.closed) {
          this.send({ type: "audio-end", responseId: current.id });
          this.send({ type: "status", status: "listening" });
        }
      }
    }
  }
  private voiceError(error?: unknown) {
    this.voice = false;
    this.stt?.close();
    this.stt = null;
    if (!this.closed)
      this.send({
        type: "error",
        scope: "voice",
        message:
          error instanceof DeepgramConnectionError
            ? error.message
            : "Microphone transcription is unavailable. Check the Deepgram key and retry microphone.",
      });
  }
  async finish() {
    if (this.finishing || this.closed) return;
    const interview = this.deps.store.get(this.id);
    if (!interview || interview.status !== "active") return;
    this.finishing = true;
    this.interrupt();
    this.send({ type: "status", status: "finishing" });
    if (this.deadline) clearTimeout(this.deadline);
    this.stt?.close();
    this.stt = null;
    this.deps.store.finish(this.id);
    this.send({ type: "finished", id: this.id });
    void this.deps.feedback(this.id);
  }
  close() {
    if (this.closed) return;
    this.interrupt();
    this.closed = true;
    if (this.deadline) clearTimeout(this.deadline);
    this.stt?.close();
    this.tts?.close();
  }
}
