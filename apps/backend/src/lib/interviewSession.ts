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
    topics: InterviewDetail["topics"],
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
  private active = false;
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
  private clockTask: Promise<void> | null = null;
  private clockStarted = false;
  private awaitingPlaybackStart = new Set<number>();
  private connectionId = crypto.randomUUID();
  private latestTurn = -1;
  private finalizedTurn = -1;
  private turnTask: Promise<void> = Promise.resolve();
  private interruptionTask: Promise<void> = Promise.resolve();

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
    if (event.type === "playback-started") {
      // A speech connection or text delta is not proof that audio was heard.
      if (!this.awaitingPlaybackStart.delete(event.responseId)) return;
      await this.updateClock(true);
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
      const saved = await this.deps.store.get(this.id);
      if (!saved || saved.status === "completed") return;
      if (!this.stt) {
        this.connectionId = crypto.randomUUID();
        this.latestTurn = this.finalizedTurn = -1;
        this.stt = this.deps.stt(
          (event) => this.deps.background(this.turn(event)),
          (error) => this.voiceError(error),
          saved.topics,
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
      this.active = interview.status === "active";
      await this.updateClock();
      if (this.closed || this.finishing) return;
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
  private async updateClock(begin = false): Promise<void> {
    if (this.clockTask) {
      await this.clockTask;
      return this.updateClock(begin);
    }
    const task = (async () => {
      const interview = begin
        ? await this.deps.store.startClock(this.id)
        : await this.deps.store.get(this.id);
      if (
        !interview ||
        interview.status !== "active" ||
        interview.startedAt == null ||
        this.finishing
      )
        return;
      this.clockStarted = true;
      this.awaitingPlaybackStart.clear();
      const deadline = interview.startedAt + interview.duration * 60000;
      await this.deps.scheduleDeadline(deadline);
      // Keep the durable deadline after disconnect, but do not recreate a local timer.
      if (this.closed || this.finishing) return;
      if (!this.deadline) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
          this.deps.background(this.finish());
          return;
        }
        this.deadline = setTimeout(
          () => this.deps.background(this.finish()),
          remaining,
        );
      }
      if (begin) this.send({ type: "ready", interview });
    })();
    this.clockTask = task;
    try {
      await task;
    } finally {
      if (this.clockTask === task) this.clockTask = null;
    }
  }
  private sendAudio(responseId: number, audio: Uint8Array) {
    if (audio.byteLength < 2) return;
    if (!this.clockStarted) this.awaitingPlaybackStart.add(responseId);
    this.send(packAudio(responseId, audio));
  }
  private turn(event: ListenV2TurnInfo): Promise<void> {
    if (
      this.closed ||
      this.finishing ||
      !this.voice ||
      !this.active ||
      event.turn_index < this.latestTurn ||
      event.turn_index <= this.finalizedTurn
    )
      return Promise.resolve();
    this.latestTurn = event.turn_index;
    // Cancel playback and forward interim words in the same event, without a
    // D1 round trip. Only finalized turns enter the durable write queue.
    const interrupted =
      event.event === "StartOfTurn" || event.event === "EndOfTurn"
        ? this.interrupt()
        : Promise.resolve();
    this.send({ type: "partial", text: event.transcript });
    if (event.event === "EndOfTurn" && event.transcript.trim()) {
      this.finalizedTurn = event.turn_index;
      const key = `stt:${this.connectionId}:${event.turn_index}`;
      const previous = this.turnTask;
      const task = (async () => {
        await previous;
        await interrupted;
        const interview = await this.deps.store.get(this.id);
        if (interview?.status !== "active") return;
        const message = await this.deps.store.addMessage(
          this.id,
          "user",
          event.transcript,
          key,
        );
        if (!message || this.closed) return;
        this.send({ type: "message", message });
        // A slower final write must not erase a newer turn's live words.
        if (this.finishing || this.latestTurn !== event.turn_index) return;
        this.send({ type: "status", status: "thinking" });
        this.send({ type: "partial", text: "" });
        this.deps.background(
          this.reply({
            ...interview,
            messages: [...interview.messages, message],
          }),
        );
      })();
      // Report this failure to the connection, while allowing a later retry to
      // use the queue rather than inheriting a permanently rejected promise.
      this.turnTask = task.catch(() => {});
      return task;
    }
    return interrupted;
  }
  interrupt(): Promise<void> {
    this.awaitingPlaybackStart.clear();
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
    }
    if (!current && !playback) return this.interruptionTask;
    const previous = this.interruptionTask;
    const task = (async () => {
      await previous;
      if (playback?.messageId) {
        const message = await this.deps.store.interruptMessage(
          playback.messageId,
        );
        if (message && !this.closed) this.send({ type: "message", message });
      }
      if (current) {
        await this.persist(current, "interrupted");
        if (current.savedId) {
          const message = await this.deps.store.interruptMessage(
            current.savedId,
          );
          if (message && !this.closed) this.send({ type: "message", message });
        }
      }
    })();
    this.interruptionTask = task.catch(() => {});
    return task;
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
  private async reply(interview?: InterviewDetail) {
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
            this.sendAudio(current.id, audio);
        })
      : null;
    this.tts = speech;
    let speechFailed = false;
    let speechConnected = false;
    const pendingSpeech: string[] = [];
    const speechReady = speech
      ?.connect()
      .then(() => {
        if (this.current !== current || this.closed) {
          speech.close();
          return false;
        }
        this.send({ type: "audio-start", responseId: current.id });
        speechConnected = true;
        for (const text of pendingSpeech) speech.sendText(text);
        pendingSpeech.length = 0;
        return true;
      })
      .catch((error) => {
        speechFailed = true;
        if (this.current === current) this.speechError(error);
        return false;
      });
    try {
      for await (const text of this.deps.reply(
        interview ?? (await this.deps.store.get(this.id))!,
        current.controller.signal,
      )) {
        if (current.controller.signal.aborted || this.closed) return;
        current.text += text;
        this.send({ type: "delta", responseId: current.id, text });
        if (speechConnected) speech?.sendText(text);
        else if (speech && !speechFailed) pendingSpeech.push(text);
      }
      if (current.controller.signal.aborted || this.closed) return;
      if (!current.text.trim())
        throw new Error("The interviewer returned an empty response.");
      const saving = this.persist(current, "complete");
      const flushing = speechReady?.then(async (ready) => {
        if (!ready) return false;
        try {
          await speech!.flush();
          return true;
        } catch (error) {
          if (!current.controller.signal.aborted) this.speechError(error);
          return false;
        }
      });
      const [, spoken] = await Promise.all([saving, flushing]);
      if (spoken && current.savedId && !current.controller.signal.aborted)
        this.playback = { id: current.id, messageId: current.savedId };
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
        this.sendAudio(current.id, audio);
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
    const wasActive = this.active;
    this.finishing = true;
    this.active = false;
    let completed = false;
    this.finishTask = (async () => {
      await this.clockTask;
      await this.turnTask;
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
        this.active = wasActive;
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
    await this.turnTask;
    if (this.deadline) clearTimeout(this.deadline);
    this.stt?.close();
    this.tts?.close();
  }
}
