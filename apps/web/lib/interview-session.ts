import { SpeechCapture, SpeechDetectionError } from "./speech-capture";
import { unpackAudio, type ClientEvent, type ServerEvent } from "@repo/shared";
import { initialState, useInterviewStore } from "@/store/interviewStore";
import { API_URL } from "./api";
import { AudioPlayer } from "./audio-player";

export class Session {
  private socket: WebSocket | null = null;
  private disposed = false;
  private captureDevice: SpeechCapture | null = null;
  private pauseRequest: string | null = null;
  private pauseTimeout: ReturnType<typeof setTimeout> | null = null;
  private pauseRollback: (() => void) | null = null;
  private responseId = 0;
  private replayRequested = false;
  private playbackStartResponseId: number | null = null;
  private listeningTimer: ReturnType<typeof setTimeout> | null = null;
  private cancelled = new Set<number>();
  private player = new AudioPlayer();
  constructor(
    private id: string,
    private finished: (id: string, generateFeedback: boolean) => void,
  ) {
    useInterviewStore.setState(initialState);
  }
  connect() {
    if (
      this.disposed ||
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    )
      return;
    this.responseId = 0;
    this.playbackStartResponseId = null;
    this.cancelled.clear();
    useInterviewStore.setState({
      status: "connecting",
      error: "",
      streaming: "",
      partial: "",
      caption: null,
      paused: false,
    });
    const url = new URL(`${API_URL}/api/interviews/${this.id}/ws`);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(url);
    this.socket = socket;
    socket.binaryType = "arraybuffer";
    socket.onopen = () => {
      if (!this.disposed)
        useInterviewStore.setState({ connected: true, status: "ready" });
    };
    socket.onmessage = (event) => {
      if (this.disposed || this.socket !== socket) return;
      if (event.data instanceof ArrayBuffer) {
        const frame = unpackAudio(event.data);
        if (
          frame &&
          frame.responseId === this.responseId &&
          !this.cancelled.has(frame.responseId)
        ) {
          const acknowledgeStart =
            useInterviewStore.getState().interview?.startedAt == null &&
            this.playbackStartResponseId !== frame.responseId;
          if (acknowledgeStart) this.playbackStartResponseId = frame.responseId;
          this.player.playPcm16(
            frame.audio,
            24000,
            acknowledgeStart
              ? () => {
                  if (
                    this.disposed ||
                    this.cancelled.has(frame.responseId) ||
                    this.socket !== socket ||
                    socket.readyState !== WebSocket.OPEN
                  )
                    return;
                  this.send({
                    type: "playback-started",
                    responseId: frame.responseId,
                  });
                }
              : undefined,
          );
          if (useInterviewStore.getState().status !== "speaking")
            useInterviewStore.setState({ status: "speaking" });
        }
        return;
      }
      try {
        this.event(JSON.parse(event.data) as ServerEvent);
      } catch {
        useInterviewStore.setState({
          error: "An unexpected message arrived. Reconnect to continue.",
        });
      }
    };
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.stopCapture();
      this.player.stop();
      if (!this.disposed)
        useInterviewStore.setState({
          connected: false,
          status: "disconnected",
          starting: false,
        });
    };
    socket.onerror = () => {
      if (!this.disposed)
        useInterviewStore.setState({
          error: "Could not connect to your interview. Try reconnecting.",
        });
    };
  }
  private event(event: ServerEvent) {
    if (event.type === "pause-state") {
      if (event.requestId !== this.pauseRequest) return;
      this.clearPauseRequest();
      useInterviewStore.setState({
        interview: event.interview,
        messages: event.interview.messages,
        paused: event.interview.pausedAt != null,
        pausePending: false,
      });
      this.applyPause(event.interview.pausedAt != null);
      return;
    }
    if (event.type === "ready") {
      useInterviewStore.setState({
        interview: event.interview,
        messages: event.interview.messages,
      });
      if (!this.pauseRequest) {
        useInterviewStore.setState({
          paused: event.interview.pausedAt != null,
        });
        this.applyPause(event.interview.pausedAt != null);
      }
      if (event.interview.status === "completed")
        this.finished(this.id, event.interview.feedbackStatus !== "skipped");
    }
    if (
      event.type === "status" &&
      !(event.status === "listening" && this.player.busy) &&
      useInterviewStore.getState().status !== event.status
    )
      useInterviewStore.setState({ status: event.status });
    if (event.type === "partial")
      useInterviewStore.setState((s) => ({
        partial: event.text,
        ...(event.text
          ? {
              caption: {
                role: "user" as const,
                text: event.text,
                turn:
                  s.caption?.role === "user"
                    ? s.caption.turn
                    : crypto.randomUUID(),
              },
            }
          : {}),
      }));
    if (event.type === "message")
      useInterviewStore.setState((s) => ({
        messages: s.messages.some((m) => m.id === event.message.id)
          ? s.messages.map((m) =>
              m.id === event.message.id ? event.message : m,
            )
          : [...s.messages, event.message],
        ...(event.message.role === "assistant" &&
        event.message.status !== "interrupted"
          ? { streaming: "" }
          : {}),
        // Saving a turn must not erase the words while its audio is still playing.
        // A cancelled reply can finish its history write after speech resumes.
        // Retain its transcript entry without replacing the live conversation.
        ...(event.message.role === "assistant" &&
        (event.message.status === "interrupted" || s.partial)
          ? {}
          : {
              caption: {
                role: event.message.role,
                text: event.message.content,
                turn:
                  s.caption?.role === event.message.role
                    ? s.caption.turn
                    : event.message.id,
              },
            }),
        ...(event.message.role === "user" && s.errorScope === "llm"
          ? { error: "", errorScope: null }
          : {}),
      }));
    if (event.type === "delta") {
      if (this.cancelled.has(event.responseId)) return;
      if (event.responseId !== this.responseId) {
        this.responseId = event.responseId;
        useInterviewStore.setState({ streaming: "" });
      }
      useInterviewStore.setState((s) => ({
        streaming: s.streaming + event.text,
        caption: {
          role: "assistant",
          text: s.streaming + event.text,
          turn: String(event.responseId),
        },
      }));
    }
    if (event.type === "audio-start") {
      this.clearListeningTimer();
      this.responseId = event.responseId;
      const saved = useInterviewStore.getState();
      const last = saved.messages
        .filter((message) => message.role === "assistant")
        .at(-1);
      if (this.replayRequested && last)
        useInterviewStore.setState({
          caption: {
            role: "assistant",
            text: last.content,
            turn: String(event.responseId),
          },
        });
      this.replayRequested = false;
      if (useInterviewStore.getState().errorScope === "speech")
        useInterviewStore.setState({ error: "", errorScope: null });
    }
    if (event.type === "audio-end") {
      this.prepareListening(event.responseId);
      void this.player.drain().then(() => {
        if (
          !this.disposed &&
          event.responseId === this.responseId &&
          !this.cancelled.has(event.responseId) &&
          this.socket?.readyState === WebSocket.OPEN
        ) {
          useInterviewStore.setState({ status: "listening" });
          try {
            this.send({ type: "played", responseId: event.responseId });
          } catch {
            /* Reconnection restores saved messages. */
          }
        }
      });
    }
    if (event.type === "interrupted") {
      this.cancelled.add(event.responseId);
      this.player.stop();
      useInterviewStore.setState({ streaming: "" });
    }
    if (event.type === "error") {
      if (event.requestId && event.requestId === this.pauseRequest)
        this.rollbackPause();
      useInterviewStore.setState({
        error: event.message,
        errorScope: event.scope,
        starting: false,
      });
      if (event.scope === "voice") this.stopCapture();
    }
    if (event.type === "finished") {
      this.stopCapture();
      this.player.stop();
      this.finished(event.id, event.generateFeedback !== false);
    }
  }
  private clearListeningTimer() {
    if (this.listeningTimer !== null) clearTimeout(this.listeningTimer);
    this.listeningTimer = null;
  }
  private prepareListening(responseId: number) {
    this.clearListeningTimer();
    const check = () => {
      this.listeningTimer = null;
      if (
        this.disposed ||
        responseId !== this.responseId ||
        this.cancelled.has(responseId) ||
        this.socket?.readyState !== WebSocket.OPEN
      )
        return;
      const state = useInterviewStore.getState();
      const progress = this.player.getPlaybackProgress();
      const remaining =
        (progress.totalSeconds - progress.seconds) / state.playbackRate;
      if (!state.paused && remaining <= 2.5) {
        this.send({ type: "prepare-listening", responseId });
        return;
      }
      this.listeningTimer = setTimeout(check, 250);
    };
    check();
  }
  private send(event: ClientEvent) {
    if (this.socket?.readyState !== WebSocket.OPEN)
      throw new Error("Reconnect before continuing.");
    this.socket.send(JSON.stringify(event));
  }
  async start() {
    if (useInterviewStore.getState().starting) return;
    useInterviewStore.setState({ starting: true, error: "", errorScope: null });
    try {
      await this.player.setPaused(false);
      useInterviewStore.setState({ paused: false, pausePending: false });
      await this.player.unlock();
      if (this.disposed) return;
      try {
        await this.capture();
      } catch (error) {
        this.stopCapture();
        if (this.disposed) return;
        useInterviewStore.setState({
          error:
            error instanceof SpeechDetectionError
              ? error.message
              : "Microphone access is unavailable. Allow microphone access in your browser, then retry.",
          errorScope: "voice",
        });
        return;
      }
      if (this.disposed) {
        this.stopCapture();
        return;
      }
      useInterviewStore.setState({ partial: "" });
      const last = useInterviewStore.getState().messages.at(-1);
      this.replayRequested =
        last?.role === "assistant" && last.status === "complete";
      this.send({ type: "start" });
    } catch (error) {
      useInterviewStore.setState({
        error: error instanceof Error ? error.message : "Could not start.",
        starting: false,
      });
    } finally {
      if (!this.disposed) useInterviewStore.setState({ starting: false });
    }
  }
  private async capture() {
    if (this.captureDevice) return;
    const device = new SpeechCapture({
      start: () => {
        if (!this.canSendMicrophone()) return;
        // Stop locally before waiting for STT or a server round trip. Ignore
        // late text/audio from this response while the new speech is decoded.
        this.cancelled.add(this.responseId);
        this.clearListeningTimer();
        this.player.stop();
        useInterviewStore.setState({ streaming: "", status: "listening" });
        this.send({ type: "speech-start" });
      },
      audio: (samples) => {
        if (this.canSendMicrophone()) this.socket!.send(samples.buffer);
      },
      end: () => {
        if (
          this.socket?.readyState === WebSocket.OPEN &&
          useInterviewStore.getState().interview?.status === "active"
        )
          this.send({ type: "speech-end" });
      },
      level: (level) => useInterviewStore.setState({ level }),
      error: (error) => {
        this.stopCapture();
        if (!this.disposed)
          useInterviewStore.setState({
            error: error.message,
            errorScope: "voice",
          });
      },
    });
    this.captureDevice = device;
    await device.start(useInterviewStore.getState().microphoneId);
    if (!this.disposed && this.captureDevice === device)
      useInterviewStore.setState({ micActive: true, muted: false });
  }
  private canSendMicrophone() {
    const state = useInterviewStore.getState();
    return (
      !this.disposed &&
      !state.muted &&
      !state.paused &&
      this.socket?.readyState === WebSocket.OPEN &&
      state.interview?.status === "active"
    );
  }
  private stopCapture() {
    this.clearListeningTimer();
    this.clearPauseRequest();
    this.captureDevice?.close();
    this.captureDevice = null;
    if (!this.disposed)
      useInterviewStore.setState({
        micActive: false,
        level: 0,
        muted: false,
        paused: false,
        pausePending: false,
      });
  }
  async speakLatest() {
    try {
      await this.player.unlock();
      this.replayRequested = true;
      this.send({ type: "speak" });
    } catch {
      useInterviewStore.setState({
        error: "Could not play speech. Reconnect and retry.",
        errorScope: "speech",
      });
    }
  }
  interrupt() {
    this.cancelled.add(this.responseId);
    this.player.stop();
    useInterviewStore.setState({ status: "listening" });
    try {
      this.send({ type: "interrupt" });
    } catch {
      /* Connection state is displayed separately. */
    }
  }
  mute() {
    const { muted: wasMuted, paused } = useInterviewStore.getState();
    const muted = !wasMuted;
    this.captureDevice?.setEnabled(!muted && !paused);
    useInterviewStore.setState({ muted });
  }
  private applyPause(paused: boolean) {
    this.captureDevice?.setEnabled(
      !paused && !useInterviewStore.getState().muted,
    );
    void this.player.setPaused(paused).catch(() => {
      if (!this.disposed)
        useInterviewStore.setState({
          error: "Audio could not resume. Retry speech to continue.",
          errorScope: "speech",
        });
    });
  }
  private clearPauseRequest() {
    if (this.pauseTimeout) clearTimeout(this.pauseTimeout);
    this.pauseTimeout = null;
    this.pauseRequest = null;
    this.pauseRollback = null;
  }
  private rollbackPause() {
    const rollback = this.pauseRollback;
    this.clearPauseRequest();
    rollback?.();
  }
  async pauseAudio() {
    const state = useInterviewStore.getState();
    if (
      this.disposed ||
      this.pauseRequest ||
      !state.connected ||
      state.interview?.status !== "active"
    )
      return;
    const paused = !state.paused;
    const requestId = crypto.randomUUID();
    const before = state.interview;
    const now = Date.now();
    this.pauseRequest = requestId;
    this.pauseRollback = () => {
      useInterviewStore.setState((current) => ({
        paused: state.paused,
        pausePending: false,
        interview: current.interview
          ? {
              ...current.interview,
              pausedAt: before.pausedAt,
              pausedMs: before.pausedMs,
            }
          : null,
      }));
      this.applyPause(state.paused);
    };
    useInterviewStore.setState({
      paused: true,
      pausePending: true,
      level: 0,
      interview: paused ? { ...before, pausedAt: now } : before,
    });
    // Suspend immediately; resume capture/playback only after the server has
    // confirmed the new deadline, so speech cannot arrive at a paused session.
    if (paused) this.applyPause(true);
    try {
      this.send({ type: "pause", paused, requestId });
      this.pauseTimeout = setTimeout(() => {
        this.rollbackPause();
        useInterviewStore.setState({
          error:
            "Could not confirm the interview pause. Reconnect to check its saved state.",
          errorScope: "session",
        });
      }, 8000);
    } catch {
      this.rollbackPause();
      useInterviewStore.setState({
        error: "Reconnect before pausing the interview.",
        errorScope: "session",
      });
    }
  }
  async setMicrophone(deviceId: string) {
    if (!this.captureDevice)
      throw new Error("Reconnect your microphone first.");
    await this.captureDevice.setDevice(deviceId);
    if (!this.disposed) useInterviewStore.setState({ microphoneId: deviceId });
  }
  async setSpeaker(deviceId: string) {
    await this.player.setOutputDevice(deviceId);
    if (!this.disposed) useInterviewStore.setState({ speakerId: deviceId });
  }
  setPlaybackRate(rate: number) {
    this.player.setPlaybackRate(rate);
    useInterviewStore.setState({ playbackRate: rate });
  }
  getVoiceSignal() {
    const state = useInterviewStore.getState();
    const candidate =
      state.status === "listening" && !state.muted && !state.paused;
    const inactive =
      state.paused ||
      !!state.error ||
      !["speaking", "listening"].includes(state.status) ||
      (state.status === "listening" && (!state.micActive || state.muted));
    const signal =
      state.status === "speaking"
        ? this.player.getSignal()
        : {
            level:
              candidate && state.level > 0.003
                ? Math.min(1, state.level * 5)
                : 0,
            low: 0,
            high: 0,
          };
    return { ...signal, candidate, inactive };
  }
  finish(generateFeedback = true) {
    this.send({ type: "finish", generateFeedback });
  }
  close() {
    this.disposed = true;
    this.stopCapture();
    this.player.close();
    this.socket?.close();
    this.socket = null;
  }
}
