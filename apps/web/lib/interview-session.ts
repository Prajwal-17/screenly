import { closeAudioContext } from "./audio-context";
import { unpackAudio, type ClientEvent, type ServerEvent } from "@repo/shared";
import { initialState, useInterviewStore } from "@/store/interviewStore";
import { API_URL } from "./api";
import { AudioPlayer, type SpeechSegment } from "./audio-player";

export class Session {
  private socket: WebSocket | null = null;
  private disposed = false;
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private download = false;
  private responseId = 0;
  private pendingSpeech: SpeechSegment | undefined;
  private cancelled = new Set<number>();
  private player = new AudioPlayer((text) => {
    if (this.disposed || this.cancelled.has(this.responseId)) return;
    useInterviewStore.setState({
      caption: { role: "assistant", text, turn: String(this.responseId) },
    });
  });
  constructor(
    private id: string,
    private finished: (id: string) => void,
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
    this.pendingSpeech = undefined;
    this.player.stop();
    this.cancelled.clear();
    useInterviewStore.setState({
      status: "connecting",
      error: "",
      streaming: "",
      partial: "",
      caption: null,
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
          this.player.playPcm16(frame.audio, this.pendingSpeech);
          this.pendingSpeech = undefined;
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
      if (event.interview.status === "completed") this.finished(this.id);
    }
    if (
      event.type === "status" &&
      !(event.status === "listening" && this.player.busy)
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
        // Generated/saved assistant text belongs in the transcript. Only actual
        // audio playback may reveal it below the orb.
        ...(event.message.role === "user"
          ? {
              caption: {
                role: "user" as const,
                text: event.message.content,
                turn:
                  s.caption?.role === "user"
                    ? s.caption.turn
                    : event.message.id,
              },
            }
          : {}),
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
      }));
    }
    if (event.type === "audio-start") {
      if (this.cancelled.has(event.responseId)) return;
      this.player.stop();
      this.pendingSpeech = undefined;
      this.responseId = event.responseId;
      useInterviewStore.setState({ caption: null });
      if (useInterviewStore.getState().errorScope === "speech")
        useInterviewStore.setState({ error: "", errorScope: null });
    }
    if (
      event.type === "speech-segment" &&
      event.responseId === this.responseId &&
      !this.cancelled.has(event.responseId)
    )
      this.pendingSpeech = { text: event.text, duration: event.duration };
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
      this.pendingSpeech = undefined;
      this.player.stop();
      useInterviewStore.setState((s) => ({
        streaming: "",
        caption: s.caption?.role === "assistant" ? null : s.caption,
      }));
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
      this.stopCapture(true);
      this.player.stop();
      this.finished(event.id);
    }
  }
  private send(event: ClientEvent) {
    if (this.socket?.readyState !== WebSocket.OPEN)
      throw new Error("Reconnect before continuing.");
    this.socket.send(JSON.stringify(event));
  }
  async start(download = this.download) {
    if (useInterviewStore.getState().starting) return;
    useInterviewStore.setState({ starting: true, error: "", errorScope: null });
    try {
      await this.player.unlock();
      if (this.disposed) return;
      this.download = download;
      try {
        await this.capture();
      } catch {
        this.stopCapture();
        useInterviewStore.setState({
          error:
            "Microphone access is unavailable. Allow microphone access in your browser, then retry.",
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
    if (this.stream) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    if (this.disposed) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.stream = stream;
    this.ctx = new AudioContext({ sampleRate: 16000 });
    await this.ctx.resume();
    if (this.ctx.sampleRate !== 16000)
      throw new Error("This browser does not support 16 kHz capture.");
    await this.ctx.audioWorklet.addModule("/audio/pcm-processor.js");
    this.source = this.ctx.createMediaStreamSource(stream);
    this.worklet = new AudioWorkletNode(this.ctx, "pcm-processor");
    this.source.connect(this.worklet);
    const silent = this.ctx.createGain();
    silent.gain.value = 0;
    this.worklet.connect(silent);
    silent.connect(this.ctx.destination);
    this.worklet.port.onmessage = (
      e: MessageEvent<{ type: string; samples: Int16Array; level: number }>,
    ) => {
      if (this.disposed) return;
      const muted = useInterviewStore.getState().muted;
      useInterviewStore.setState({ level: muted ? 0 : e.data.level });
      // Keep the stream clock running while muted without sending microphone content.
      if (
        this.socket?.readyState === WebSocket.OPEN &&
        useInterviewStore.getState().interview?.status === "active"
      ) {
        this.socket.send(
          muted
            ? new ArrayBuffer(e.data.samples.byteLength)
            : e.data.samples.buffer,
        );
      }
    };
    this.chunks = [];
    if (this.download && typeof MediaRecorder !== "undefined") {
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
        (type) => MediaRecorder.isTypeSupported(type),
      );
      this.recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined,
      );
      this.recorder.ondataavailable = (e) => {
        if (e.data.size) this.chunks.push(e.data);
      };
      this.recorder.start(1000);
    }
    useInterviewStore.setState({ micActive: true, muted: false });
  }
  private downloadRecording(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `screenly-recording-${this.id}.${blob.type.includes("mp4") ? "m4a" : "webm"}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  private stopCapture(save = false) {
    const recorder = this.recorder;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => {
        if (this.chunks.length) {
          const blob = new Blob(this.chunks, { type: recorder.mimeType });
          if (save) this.downloadRecording(blob);
        }
        this.chunks = [];
      };
      recorder.stop();
    }
    this.recorder = null;
    this.worklet?.disconnect();
    if (this.worklet) this.worklet.port.onmessage = null;
    this.worklet = null;
    this.source?.disconnect();
    this.source = null;
    void closeAudioContext(this.ctx);
    this.ctx = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (!this.disposed)
      useInterviewStore.setState({ micActive: false, level: 0, muted: false });
  }
  async speakLatest() {
    try {
      await this.player.unlock();
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
    this.pendingSpeech = undefined;
    this.player.stop();
    useInterviewStore.setState((s) => ({
      caption: s.caption?.role === "assistant" ? null : s.caption,
    }));
    try {
      this.send({ type: "interrupt" });
    } catch {
      /* Connection state is displayed separately. */
    }
  }
  mute() {
    const muted = !useInterviewStore.getState().muted;
    this.stream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
    useInterviewStore.setState({ muted });
  }
  finish() {
    this.send({ type: "finish" });
  }
  close() {
    this.disposed = true;
    this.stopCapture();
    this.player.close();
    this.socket?.close();
    this.socket = null;
  }
}
