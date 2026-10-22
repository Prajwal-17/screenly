import { closeAudioContext } from "./audio-context";

export class SpeechDetectionError extends Error {
  constructor() {
    super(
      "Speech detection could not start. Retry the microphone to continue.",
    );
  }
}

// Owns microphone resources and filters stale worker output on mute/close.
// A detector failure stops capture; it never falls back to continuous uploads.
export class SpeechCapture {
  private worker: Worker | null = null;
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private stream: MediaStream | null = null;
  private closed = false;
  private enabled = true;
  private switching = false;
  private epoch = 0;
  private pending = 0;
  private lastLevel = 0;
  private cancelReady: (() => void) | null = null;
  constructor(
    private handlers: {
      audio: (samples: Int16Array) => void;
      end: () => void;
      level: (level: number) => void;
      error: (error: Error) => void;
    },
  ) {}
  async start(deviceId = "default") {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(deviceId === "default" ? {} : { deviceId: { exact: deviceId } }),
      },
      video: false,
    });
    if (this.closed) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    this.stream = stream;
    try {
      const worker = (this.worker = new Worker("/vad/vad-worker.js", {
        type: "module",
      }));
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new SpeechDetectionError()),
          30000,
        );
        const finish = (error?: Error) => {
          clearTimeout(timeout);
          this.cancelReady = null;
          if (error) reject(error);
          else resolve();
        };
        this.cancelReady = () => finish();
        worker.onerror = () => finish(new SpeechDetectionError());
        worker.onmessage = ({ data }) => {
          if (data.type === "ready") finish();
          if (data.type === "error") finish(new SpeechDetectionError());
        };
        worker.postMessage({ type: "init" });
      });
      if (this.closed) return;
      worker.onerror = () => this.fail();
      worker.onmessage = ({ data }) => {
        if (this.closed) return;
        if (data.type === "error") return this.fail();
        if (data.epoch !== this.epoch) return;
        if (data.type === "processed")
          this.pending = Math.max(0, this.pending - 1);
        if (!this.enabled || this.switching) return;
        if (data.type === "audio") this.handlers.audio(data.samples);
        if (data.type === "speech-end") this.handlers.end();
      };
      const ctx = (this.ctx = new AudioContext({ sampleRate: 16000 }));
      await ctx.resume();
      if (ctx.sampleRate !== 16000) throw new SpeechDetectionError();
      await ctx.audioWorklet.addModule("/audio/pcm-processor.js");
      if (this.closed) return;
      this.source = ctx.createMediaStreamSource(stream);
      this.worklet = new AudioWorkletNode(ctx, "pcm-processor");
      this.worklet.port.onmessage = ({
        data,
      }: MessageEvent<{ samples: Float32Array; level: number }>) => {
        if (this.closed || !this.enabled || this.switching) return;
        // Do not build seconds of inference lag on an overloaded device.
        if (++this.pending > 32) return this.fail();
        worker.postMessage(
          { type: "frame", frame: data.samples, epoch: this.epoch },
          [data.samples.buffer],
        );
        const now = performance.now();
        if (now - this.lastLevel >= 96) {
          this.lastLevel = now;
          this.handlers.level(data.level);
        }
      };
      this.source.connect(this.worklet);
      const silent = ctx.createGain();
      silent.gain.value = 0;
      this.worklet.connect(silent);
      silent.connect(ctx.destination);
    } catch (error) {
      this.close();
      throw error instanceof SpeechDetectionError
        ? error
        : new SpeechDetectionError();
    }
  }
  setEnabled(enabled: boolean) {
    if (this.enabled === enabled || this.closed) return;
    // End already-uploaded speech before discarding buffered microphone audio.
    if (!enabled) this.handlers.end();
    this.enabled = enabled;
    this.pending = 0;
    this.epoch++;
    this.worker?.postMessage({ type: "reset", epoch: this.epoch });
    this.worklet?.port.postMessage({ type: "reset" });
    this.stream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
    this.handlers.level(0);
  }
  async setDevice(deviceId: string) {
    if (this.closed || !this.ctx || !this.worklet || this.switching) return;
    this.switching = true;
    this.handlers.end();
    this.pending = 0;
    this.epoch++;
    this.worker?.postMessage({ type: "reset", epoch: this.epoch });
    const previous = this.stream;
    previous?.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });
    let replacement: MediaStream | null = null;
    try {
      replacement = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(deviceId === "default" ? {} : { deviceId: { exact: deviceId } }),
        },
        video: false,
      });
      if (this.closed) {
        replacement.getTracks().forEach((track) => track.stop());
        return;
      }
      const source = this.ctx.createMediaStreamSource(replacement);
      this.worklet.port.postMessage({ type: "reset" });
      source.connect(this.worklet);
      this.source?.disconnect();
      this.source = source;
      this.stream = replacement;
      replacement.getAudioTracks().forEach((track) => {
        track.enabled = this.enabled;
      });
      previous?.getTracks().forEach((track) => track.stop());
    } catch (error) {
      replacement?.getTracks().forEach((track) => track.stop());
      throw error;
    } finally {
      if (!this.closed)
        this.stream?.getAudioTracks().forEach((track) => {
          track.enabled = this.enabled;
        });
      this.switching = false;
    }
  }
  private fail() {
    this.close();
    this.handlers.error(new SpeechDetectionError());
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.cancelReady?.();
    this.worker?.terminate();
    this.worker = null;
    if (this.worklet) this.worklet.port.onmessage = null;
    this.worklet?.disconnect();
    this.source?.disconnect();
    this.worklet = null;
    this.source = null;
    void closeAudioContext(this.ctx);
    this.ctx = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
