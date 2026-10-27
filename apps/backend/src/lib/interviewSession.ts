import {
  packAudio,
  type ClientEvent,
  type InterviewDetail,
  type InterviewPhase,
  type ServerEvent,
} from "@repo/shared";
import type { ListenV2TurnInfo } from "@deepgram/sdk/listen";

import type { InterviewStore } from "../db/interviews";

import { STTService } from "./sttService";
import { DeepgramConnectionError } from "./deepgramSocket";
import { TTSService } from "./ttsService";
import { interviewWelcome, type OpeningReply } from "./interviewOpening";

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
  openingReply: (
    interview: InterviewDetail,
    signal: AbortSignal,
  ) => Promise<OpeningReply>;
  feedback: (id: string) => Promise<void>;
  stt: (
    turn: (event: ListenV2TurnInfo) => void,
    error: (error: Error) => void,
    topics: InterviewDetail["topics"],
  ) => Pick<STTService, "connect" | "sendAudio" | "endSpeech" | "close">;
  tts: (
    audio: (data: Uint8Array) => void,
  ) => Pick<TTSService, "connect" | "sendText" | "flush" | "close">;
};
type PreparedReply = {
  turn: number;
  transcript: string;
  controller: AbortController;
  ready: Promise<{
    output: AsyncGenerator<string>;
    first: IteratorResult<string>;
  } | null>;
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
    phase: InterviewPhase;
    saving?: Promise<void>;
  } | null = null;
  private deadline: ReturnType<typeof setTimeout> | null = null;
  private clockTask: Promise<void> = Promise.resolve();
  private paused = false;
  private pauseOutput: (ServerEvent | Uint8Array)[] = [];
  private pauseBytes = 0;
  private pendingTurns: ListenV2TurnInfo[] = [];
  private pendingReply = false;
  private clockStarted = false;
  private awaitingPlaybackStart = new Set<number>();
  private connectionId = crypto.randomUUID();
  private latestTurn = -1;
  private finalizedTurn = -1;
  private turnTask: Promise<void> = Promise.resolve();
  private interruptionTask: Promise<void> = Promise.resolve();
  private preparedReply: PreparedReply | null = null;
  private speechRevision = 0;

  constructor(
    readonly id: string,
    private emit: (event: ServerEvent | Uint8Array) => void,
    private deps: SessionDependencies,
  ) {}
  async ready() {
    const interview = await this.deps.store.get(this.id);
    if (interview && !this.closed) {
      this.paused = interview.pausedAt != null;
      this.send({ type: "ready", interview });
    }
  }
  async handle(event: ClientEvent) {
    if (this.closed || this.finishing) return;
    if (event.type === "pause") {
      await this.setPaused(event.paused, event.requestId);
      return;
    }
    if (event.type === "speech-end") {
      if (this.voice) this.stt?.endSpeech();
      return;
    }
    if (event.type === "speech-start") {
      if (this.voice && this.active && !this.paused) {
        this.speechRevision++;
        await this.interrupt();
      }
      return;
    }
    if (event.type === "finish") {
      await this.finish(event.generateFeedback ?? true);
      return;
    }
    if (event.type === "interrupt") {
      await this.interrupt();
      return;
    }
    if (event.type === "played" || event.type === "prepare-listening") {
      if (this.playback?.id === event.responseId) {
        if (event.type === "played") this.playback = null;
        // Hide an idle provider handshake behind the last part of playback.
        // Still retire quiet sockets; no silent keepalive audio is uploaded.
        if (this.voice && this.active && !this.paused) {
          try {
            await this.stt?.connect();
          } catch (error) {
            // Warming is optional. A transient failure here must not disable
            // the microphone; the next audio packet makes a fresh attempt.
            if (!(error instanceof DeepgramConnectionError && error.retryable))
              this.voiceError(error);
          }
        }
      }
      return;
    }
    if (event.type === "playback-started") {
      // A speech connection or text delta is not proof that audio was heard.
      if (!this.awaitingPlaybackStart.delete(event.responseId)) return;
      await this.updateClock(true);
      return;
    }
    if (event.type === "speak") {
      if (this.paused) return;
      await this.speakLatest();
      return;
    }
    if (event.type === "start") {
      await this.start();
      return;
    }
  }
  audio(data: Uint8Array) {
    if (
      !this.closed &&
      this.voice &&
      !this.paused &&
      !this.finishing &&
      this.stt
    )
      this.deps.background(this.stt.sendAudio(data));
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
      let interview = await this.deps.store.start(this.id);
      // Clicking Resume interview after a reconnect explicitly resumes its saved budget.
      if (interview.pausedAt != null)
        interview = await this.deps.store.setPaused(this.id, false);
      this.paused = false;
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
  private send(event: ServerEvent | Uint8Array) {
    const control =
      !(event instanceof Uint8Array) &&
      ["ready", "pause-state", "error", "finished"].includes(event.type);
    if (this.paused && !this.finishing && !control) {
      this.pauseBytes +=
        event instanceof Uint8Array
          ? event.byteLength
          : JSON.stringify(event).length * 2;
      // Only the already-requested reply may finish while paused. Keep its
      // output for exact resume, with a hard bound on retained provider audio.
      if (this.pauseBytes > 8 * 1024 * 1024) {
        this.pauseOutput = [];
        this.pauseBytes = 0;
        this.emit({
          type: "error",
          scope: "speech",
          message:
            "The paused question is too long to keep. Resume and replay it to continue.",
        });
        this.deps.background(this.interrupt());
        return;
      }
      this.pauseOutput.push(event);
    } else this.emit(event);
  }
  private queueClock(work: () => Promise<void>) {
    const task = this.clockTask.then(work);
    this.clockTask = task.catch(() => {});
    return task;
  }
  private updateClock(begin = false): Promise<void> {
    return this.queueClock(async () => {
      const interview = begin
        ? await this.deps.store.startClock(this.id)
        : await this.deps.store.get(this.id);
      if (!interview || interview.status !== "active" || this.finishing) return;
      await this.applyClock(interview);
      if (begin) this.send({ type: "ready", interview });
    });
  }
  private async applyClock(interview: InterviewDetail) {
    if (this.deadline) clearTimeout(this.deadline);
    this.deadline = null;
    this.paused = interview.pausedAt != null;
    if (interview.startedAt == null || this.paused) {
      if (this.paused) await this.deps.cancelDeadline();
      return;
    }
    this.clockStarted = true;
    this.awaitingPlaybackStart.clear();
    const deadline =
      interview.startedAt +
      interview.duration * 60000 +
      (interview.pausedMs ?? 0);
    await this.deps.scheduleDeadline(deadline);
    if (this.closed || this.finishing) return;
    const remaining = deadline - Date.now();
    if (remaining <= 0) this.deps.background(this.finish());
    else
      this.deadline = setTimeout(
        () => this.deps.background(this.finish()),
        remaining,
      );
  }
  private async setPaused(paused: boolean, requestId: string) {
    try {
      await this.queueClock(async () => {
        if (!this.active || this.closed || this.finishing) return;
        const interview = await this.deps.store.setPaused(this.id, paused);
        await this.applyClock(interview);
        this.send({ type: "pause-state", interview, requestId });
        if (paused) this.stt?.endSpeech();
        if (paused) this.cancelPreparedReply();
        else {
          const output = this.pauseOutput;
          this.pauseOutput = [];
          this.pauseBytes = 0;
          for (const event of output) this.emit(event);
          const turns = this.pendingTurns;
          this.pendingTurns = [];
          const reply = this.pendingReply;
          this.pendingReply = false;
          for (const turn of turns) this.deps.background(this.turn(turn));
          if (reply && !turns.length && !this.current)
            this.deps.background(this.reply());
        }
      });
    } catch {
      this.send({
        type: "error",
        scope: "session",
        requestId,
        message: "Could not update the interview pause. Please try again.",
      });
    }
  }
  private sendAudio(
    responseId: number,
    audio: Uint8Array,
    phase: InterviewPhase,
  ) {
    if (audio.byteLength < 2) return;
    if (!this.clockStarted && phase === "questions")
      this.awaitingPlaybackStart.add(responseId);
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
    if (this.paused) {
      if (
        event.event === "EndOfTurn" &&
        event.transcript.trim() &&
        !this.pendingTurns.some((turn) => turn.turn_index === event.turn_index)
      )
        this.pendingTurns.push(event);
      return Promise.resolve();
    }
    const resumed =
      event.event === "StartOfTurn" ||
      event.event === "TurnResumed" ||
      (event.event === "Update" && event.turn_index > this.latestTurn);
    if (resumed) this.speechRevision++;
    this.latestTurn = event.turn_index;
    if (
      event.event === "StartOfTurn" ||
      event.event === "TurnResumed" ||
      (event.event === "Update" &&
        this.preparedReply?.transcript !== event.transcript)
    )
      this.cancelPreparedReply();
    // Detach a matching draft before interrupt() cancels any unused one.
    const prepared =
      event.event === "EndOfTurn" &&
      this.preparedReply?.turn === event.turn_index &&
      this.preparedReply.transcript === event.transcript
        ? this.preparedReply
        : null;
    if (prepared) this.preparedReply = null;
    // Cancel playback and forward interim words in the same event, without a
    // D1 round trip. Only finalized turns enter the durable write queue.
    const interrupted =
      resumed || event.event === "EndOfTurn"
        ? this.interrupt()
        : Promise.resolve();
    this.send({ type: "partial", text: event.transcript });
    if (event.event === "EagerEndOfTurn" && event.transcript.trim()) {
      this.prepareReply(event);
      return interrupted;
    }
    if (event.event === "EndOfTurn" && event.transcript.trim()) {
      this.finalizedTurn = event.turn_index;
      const revision = this.speechRevision;
      const key = `stt:${this.connectionId}:${event.turn_index}`;
      const previous = this.turnTask;
      const task = (async () => {
        let adopted = false;
        try {
          await previous;
          await interrupted;
          const interview = await this.deps.store.get(this.id);
          if (interview?.status !== "active") return;
          const message = await this.deps.store.addMessage(
            this.id,
            "user",
            event.transcript,
            key,
            "complete",
            interview.phase ?? "questions",
          );
          if (!message || this.closed) return;
          this.send({ type: "message", message });
          // A slower final write must not erase a newer turn's live words.
          if (
            this.finishing ||
            this.latestTurn !== event.turn_index ||
            revision !== this.speechRevision
          )
            return;
          if (this.paused) {
            this.pendingReply = true;
            return;
          }
          this.send({ type: "status", status: "thinking" });
          this.send({ type: "partial", text: "" });
          adopted = true;
          this.deps.background(
            this.reply(
              {
                ...interview,
                messages: [...interview.messages, message],
              },
              prepared,
            ),
          );
        } finally {
          if (!adopted && prepared) this.discardPreparedReply(prepared);
        }
      })();
      // Report this failure to the connection, while allowing a later retry to
      // use the queue rather than inheriting a permanently rejected promise.
      this.turnTask = task.catch(() => {});
      return task;
    }
    return interrupted;
  }
  private prepareReply(event: ListenV2TurnInfo) {
    if (
      this.preparedReply?.turn === event.turn_index &&
      this.preparedReply.transcript === event.transcript
    )
      return;
    this.cancelPreparedReply();
    const prepared: PreparedReply = {
      turn: event.turn_index,
      transcript: event.transcript,
      controller: new AbortController(),
      ready: Promise.resolve(null),
    };
    this.preparedReply = prepared;
    prepared.ready = (async () => {
      await this.turnTask;
      await this.interruptionTask;
      if (prepared.controller.signal.aborted || this.closed) return null;
      let interview = await this.deps.store.get(this.id);
      const finalized = this.finalizedTurn >= event.turn_index;
      if (finalized) {
        // A final write can win this read race. Wait for it, then use its saved
        // message once. Repeated words in a later segment are still new speech.
        await this.turnTask;
        interview = await this.deps.store.get(this.id);
      }
      if (
        !interview ||
        interview.status !== "active" ||
        interview.phase === "opening" ||
        prepared.controller.signal.aborted ||
        this.closed ||
        this.finishing ||
        this.paused
      )
        return null;
      const output = this.deps.reply(
        {
          ...interview,
          messages: [
            ...interview.messages,
            ...(finalized
              ? []
              : [
                  {
                    id: `draft:${event.turn_index}`,
                    role: "user" as const,
                    content: event.transcript,
                    status: "complete" as const,
                    phase: "questions" as const,
                    createdAt: Date.now(),
                  },
                ]),
          ],
        },
        prepared.controller.signal,
      );
      // Prefetch only one chunk. The generator then applies backpressure until
      // the final transcript is saved, bounding speculative output in memory.
      const first = await output.next();
      if (prepared.controller.signal.aborted) {
        await output.return(undefined);
        return null;
      }
      return { output, first };
    })().catch(() => null); // A failed draft falls back to a normal final reply.
    this.deps.background(prepared.ready.then(() => {}));
  }
  private cancelPreparedReply() {
    const prepared = this.preparedReply;
    this.preparedReply = null;
    if (!prepared) return;
    this.discardPreparedReply(prepared);
  }
  private discardPreparedReply(prepared: PreparedReply) {
    prepared.controller.abort();
    this.deps.background(
      prepared.ready
        .then(async (ready) => {
          await ready?.output.return(undefined);
        })
        .catch(() => {}), // Cancellation is expected, not a connection failure.
    );
  }
  interrupt(): Promise<void> {
    this.cancelPreparedReply();
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
    }
    if (playback) {
      this.send({ type: "interrupted", responseId: playback.id });
    }
    if (!current && !playback) return this.interruptionTask;
    // Generation can finish before browser playback. Both interruption paths
    // must leave the interviewer listening, including replayed speech.
    this.send({ type: "status", status: "listening" });
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
        current.phase,
      );
      current.savedId = message?.id ?? null;
      if (
        message &&
        !this.closed &&
        (!current.controller.signal.aborted || message.status === "interrupted")
      )
        this.send({ type: "message", message });
    })();
    return current.saving;
  }
  private async reply(
    interview?: InterviewDetail,
    prepared: PreparedReply | null = null,
  ) {
    if (this.closed || this.finishing || this.current) {
      if (prepared) this.discardPreparedReply(prepared);
      return;
    }
    if (this.paused) {
      if (prepared) this.discardPreparedReply(prepared);
      this.pendingReply = true;
      return;
    }
    const current = {
      id: ++this.responseId,
      text: "",
      controller: prepared?.controller ?? new AbortController(),
      saved: false,
      savedId: null as string | null,
      phase: interview?.phase ?? "questions",
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
            this.sendAudio(current.id, audio, current.phase);
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
      let detail = interview ?? (await this.deps.store.get(this.id))!;
      current.phase = detail.phase ?? "questions";
      let openingText: string | null = null;
      if (detail.phase === "opening") {
        if (detail.messages.at(-1)?.role === "user") {
          const decision = await this.deps.openingReply(
            detail,
            current.controller.signal,
          );
          if (current.controller.signal.aborted || this.closed) return;
          if (decision.ready) {
            detail = await this.deps.store.beginQuestions(this.id);
            current.phase = detail.phase ?? "questions";
            this.send({ type: "ready", interview: detail });
          } else openingText = decision.text;
        } else openingText = interviewWelcome(detail);
      }
      if (current.controller.signal.aborted || this.closed) return;
      const draft = await prepared?.ready;
      if (current.controller.signal.aborted || this.closed) return;
      const output =
        openingText == null
          ? draft
            ? (async function* () {
                if (!draft.first.done) yield draft.first.value;
                yield* draft.output;
              })()
            : this.deps.reply(detail, current.controller.signal)
          : (async function* () {
              yield openingText;
            })();
      for await (const text of output) {
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
      if (prepared) this.discardPreparedReply(prepared);
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
      phase: message.phase ?? "questions",
    };
    this.current = current;
    const speech = this.deps.tts((audio) => {
      if (
        !this.closed &&
        this.current === current &&
        !current.controller.signal.aborted
      )
        this.sendAudio(current.id, audio, current.phase);
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
    console.warn(
      JSON.stringify({
        event: "transcription_failed",
        code:
          error instanceof DeepgramConnectionError &&
          /^[A-Z0-9_-]{1,48}$/.test(error.code)
            ? error.code
            : "UNKNOWN",
      }),
    );
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
            : "Microphone transcription stopped. Retry the microphone to reconnect.",
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
      // Pause may receive the final transcript for speech already uploaded.
      // Ending must retain those answers without starting another reply.
      if (this.pendingTurns.length) {
        await this.interrupt();
        for (const turn of this.pendingTurns) {
          if (turn.turn_index <= this.finalizedTurn) continue;
          const message = await this.deps.store.addMessage(
            this.id,
            "user",
            turn.transcript,
            `stt:${this.connectionId}:${turn.turn_index}`,
          );
          this.finalizedTurn = turn.turn_index;
          if (message) this.send({ type: "message", message });
        }
        this.pendingTurns = [];
      }
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
    this.pauseOutput = [];
    this.pendingTurns = [];
    await this.interrupt();
    await this.turnTask;
    if (this.deadline) clearTimeout(this.deadline);
    this.stt?.close();
    this.tts?.close();
  }
}
