import {
  packAudio,
  type ClientEvent,
  type InterviewDetail,
  type ServerEvent,
} from "@repo/shared";
import type { ListenV2TurnInfo } from "@deepgram/sdk/listen";

import type { InterviewStore } from "../db/interviews";

import { STTService } from "./sttService";
import { DeepgramConnectionError } from "./deepgramSocket";
import { TTSService } from "./ttsService";

export type SessionDependencies = {
  store: InterviewStore;
  background: (task: Promise<unknown>) => void;
  scheduleDeadline: (deadline: number) => Promise<void>;
  cancelDeadline: () => Promise<void>;
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
export class InterviewSession {
  private closed = false;
  private finishing = false;
  private finishTask: Promise<void> | null = null;
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
    saving?: Promise<void>;
  } | null = null;
  private deadline: ReturnType<typeof setTimeout> | null = null;
  private readonly connectionId = crypto.randomUUID();

  constructor(
    readonly id: string,
    private send: (event: ServerEvent | Uint8Array) => void,
    private deps: SessionDependencies,
  ) {}
  async ready() {
    const interview = await this.deps.store.get(this.id);
    if (interview && !this.closed) this.send({ type: "ready", interview });
  }
  async handle(event: ClientEvent) {
    if (this.closed || this.finishing) return;
    if (event.type === "finish") {
      await this.finish(event.generateFeedback ?? true);
      return;
    }
    if (event.type === "interrupt") {
      await this.interrupt();
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
    if (this.starting) return;
    this.starting = true;
    try {
      if ((await this.deps.store.get(this.id))?.status === "completed") return;
      if (!this.stt) {
        this.stt = this.deps.stt(
          (event) => this.deps.background(this.turn(event)),
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
      const interview = await this.deps.store.start(this.id);
      await this.deps.scheduleDeadline(
        interview.startedAt! + interview.duration * 60000,
      );
      if (!this.deadline) {
        const remaining =
          interview.duration * 60000 - (Date.now() - interview.startedAt!);
        if (remaining <= 0) {
          await this.finish();
          return;
        }
        this.deadline = setTimeout(() => {
          this.deps.background(this.finish());
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
  private async turn(event: ListenV2TurnInfo) {
    if (
      this.closed ||
      this.finishing ||
      !this.voice ||
      (await this.deps.store.get(this.id))?.status !== "active"
    )
      return;
    if (event.event === "StartOfTurn") await this.interrupt();
    this.send({ type: "partial", text: event.transcript });
    if (event.event === "EndOfTurn" && event.transcript.trim()) {
      const key = `stt:${this.connectionId}:${event.turn_index}`;
      if (await this.deps.store.hasMessageSource(this.id, key)) return;
      await this.interrupt();
      const message = await this.deps.store.addMessage(
        this.id,
        "user",
        event.transcript,
        key,
      );
      if (!message) return;
      this.send({ type: "status", status: "thinking" });
      this.send({ type: "partial", text: "" });
      this.send({ type: "message", message });
      this.deps.background(this.reply());
    }
  }
  async interrupt() {
    const playback = this.playback;
    this.playback = null;
    const current = this.current;
    if (current) {
      current.controller.abort();
      this.current = null;
      this.tts?.close();
      this.tts = null;
      this.send({ type: "interrupted", responseId: current.id });
      this.send({ type: "status", status: "listening" });
    }
    if (playback) {
      this.send({ type: "interrupted", responseId: playback.id });
      const message = playback.messageId
        ? await this.deps.store.interruptMessage(playback.messageId)
        : undefined;
      if (message && !this.closed) this.send({ type: "message", message });
    }
    if (current) {
      await this.persist(current, "interrupted");
      if (current.savedId) {
        const message = await this.deps.store.interruptMessage(current.savedId);
        if (message && !this.closed) this.send({ type: "message", message });
      }
    }
  }
  private persist(
    current: NonNullable<InterviewSession["current"]>,
    status: "complete" | "interrupted",
  ): Promise<void> {
    if (current.saving) return current.saving;
    if (current.saved || !current.text.trim()) return Promise.resolve();
    current.saved = true;
    current.saving = (async () => {
      const message = await this.deps.store.addMessage(
        this.id,
        "assistant",
        current.text.trim(),
        `assistant:${this.connectionId}:${current.id}`,
        current.controller.signal.aborted ? "interrupted" : status,
      );
      current.savedId = message?.id ?? null;
      if (message && !this.closed) this.send({ type: "message", message });
    })();
    return current.saving;
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
    try {
      for await (const text of this.deps.reply(
        (await this.deps.store.get(this.id))!,
        current.controller.signal,
      )) {
        if (current.controller.signal.aborted || this.closed) return;
        current.text += text;
        this.send({ type: "delta", responseId: current.id, text });
        if (speech && (await speechReady)) speech.sendText(text);
      }
      if (current.controller.signal.aborted || this.closed) return;
      if (!current.text.trim())
        throw new Error("The interviewer returned an empty response.");
      await this.persist(current, "complete");
      if (speech && (await speechReady)) {
        try {
          await speech.flush();
          if (current.savedId && !current.controller.signal.aborted)
            this.playback = { id: current.id, messageId: current.savedId };
        } catch (error) {
          if (!current.controller.signal.aborted) this.speechError(error);
        }
      }
    } catch {
      if (!current.controller.signal.aborted && !this.closed) {
        await this.persist(current, "interrupted");
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
    const interview = await this.deps.store.get(this.id);
    const message = interview?.messages
      .filter((item) => item.role === "assistant")
      .at(-1);
    if (interview?.status !== "active" || !message || this.closed) return;
    if (!this.deps.speechEnabled) {
      this.speechError();
      return;
    }
    await this.interrupt();
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
  finish(generateFeedback = true): Promise<void> {
    if (this.finishTask) return this.finishTask;
    if (this.closed) return Promise.resolve();
    this.finishing = true;
    let completed = false;
    this.finishTask = (async () => {
      const interview = await this.deps.store.get(this.id);
      if (!interview || interview.status !== "active") return;
      await this.interrupt();
      this.send({ type: "status", status: "finishing" });
      if (this.deadline) clearTimeout(this.deadline);
      this.stt?.close();
      this.stt = null;
      await this.deps.store.finish(this.id, generateFeedback);
      if (generateFeedback) await this.deps.feedback(this.id);
      else await this.deps.cancelDeadline();
      this.send({ type: "finished", id: this.id, generateFeedback });
      completed = true;
    })().finally(() => {
      if (!completed) {
        this.finishing = false;
        this.finishTask = null;
      }
    });
    return this.finishTask;
  }
  async close() {
    if (this.closed) return;
    this.closed = true;
    await this.interrupt();
    if (this.deadline) clearTimeout(this.deadline);
    this.stt?.close();
    this.tts?.close();
  }
}
