import { SpeechCapture, SpeechDetectionError } from "./speech-capture";
import { unpackAudio, type ClientEvent, type ServerEvent } from "@repo/shared";
import { initialState, useInterviewStore } from "@/store/interviewStore";
import { API_URL } from "./api";
import { AudioPlayer } from "./audio-player";

export class Session {
  private socket: WebSocket | null = null;
  private disposed = false;
  private captureDevice: SpeechCapture | null = null;
  private responseId = 0;
  private replayRequested = false;
  private playbackStartResponseId: number | null = null;
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
    if (event.type === "ready") {
      useInterviewStore.setState({
        interview: event.interview,
        messages: event.interview.messages,
      });
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
        ...(event.message.role === "assistant" ? { streaming: "" } : {}),
        // Saving a turn must not erase the words while its audio is still playing.
        caption: {
          role: event.message.role,
          text: event.message.content,
          turn:
            s.caption?.role === event.message.role
              ? s.caption.turn
              : event.message.id,
        },
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
    if (event.type === "audio-end")
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
    if (event.type === "interrupted") {
      this.cancelled.add(event.responseId);
      this.player.stop();
      useInterviewStore.setState({ streaming: "" });
    }
    if (event.type === "error") {
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
      useInterviewStore.setState({ paused: false });
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
    await device.start();
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
    this.captureDevice?.close();
    this.captureDevice = null;
    if (!this.disposed)
      useInterviewStore.setState({
        micActive: false,
        level: 0,
        muted: false,
        paused: false,
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
  async pauseAudio() {
    const { paused: wasPaused, muted } = useInterviewStore.getState();
    const paused = !wasPaused;
    useInterviewStore.setState({ paused, level: 0 });
    this.captureDevice?.setEnabled(!paused && !muted);
    try {
      await this.player.setPaused(paused);
    } catch {
      useInterviewStore.setState({
        error: "Audio could not resume. Retry speech to continue.",
        errorScope: "speech",
      });
    }
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
