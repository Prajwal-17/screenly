import { closeAudioContext } from "./audio-context";
import { playbackRates } from "./audio/playback-rates";
import type {
  PlaybackCommand,
  PlaybackEvent,
} from "./audio/playback-processor";

export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private initializing: Promise<void> | null = null;
  private analyser: AnalyserNode | null = null;
  private waveform = new Float32Array(512);
  private spectrum = new Uint8Array(256);
  private rate = 1;
  private paused = false;
  private playing = false;
  private generation = 0;
  private endSent = false;
  private startTime: number | null = null;
  private endTime: number | null = null;
  private onStart: (() => void)[] = [];
  private waiters: (() => void)[] = [];
  private startTimer: ReturnType<typeof setTimeout> | null = null;

  // The audio thread reports when processed samples actually reach its output.
  // Buffer arrival, worklet lookahead, and a suspended context never start time.
  private observePlayback = () => {
    if (this.startTimer) clearTimeout(this.startTimer);
    this.startTimer = null;
    if (this.ctx?.state !== "running") return;
    if (this.startTime != null && this.ctx.currentTime >= this.startTime) {
      this.startTime = null;
      this.onStart.splice(0).forEach((notify) => notify());
    }
    if (this.endTime != null && this.ctx.currentTime >= this.endTime) {
      this.endTime = null;
      this.playing = false;
      this.resolveWaiters();
    }
    if (this.startTime != null || this.endTime != null)
      this.startTimer = setTimeout(this.observePlayback, 16);
  };

  async unlock() {
    // TTS is 24 kHz mono; keep its sample rate intact throughout processing.
    const context = (this.ctx ??= new AudioContext({ sampleRate: 24000 }));
    if (!this.analyser) {
      this.analyser = context.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.25;
      this.analyser.connect(context.destination);
      context.addEventListener("statechange", this.observePlayback);
    }
    // Resume in the user gesture, before awaiting module loading (Safari).
    const resume = this.paused ? Promise.resolve() : context.resume();
    this.initializing ??= context.audioWorklet
      .addModule("/audio/playback-processor.js")
      .then(() => {
        if (this.ctx !== context || !this.analyser) return;
        this.node = new AudioWorkletNode(context, "speech-playback", {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [1],
        });
        this.node.connect(this.analyser);
        this.node.port.onmessage = ({ data }: MessageEvent<PlaybackEvent>) => {
          if (data.generation !== this.generation) return;
          if (data.type === "started") this.startTime = data.time;
          if (data.type === "ended") this.endTime = data.time;
          this.observePlayback();
        };
      })
      .catch((error) => {
        this.initializing = null;
        throw error;
      });
    await Promise.all([resume, this.initializing]);
  }

  get busy() {
    return this.playing;
  }

  private post(command: PlaybackCommand, transfer: Transferable[] = []) {
    this.node?.port.postMessage(command, transfer);
  }

  playPcm16(buffer: ArrayBuffer, sampleRate = 24000, onStart?: () => void) {
    if (!this.ctx || !this.node || buffer.byteLength < 2) return;
    if (sampleRate !== this.ctx.sampleRate)
      throw new Error("Speech and playback sample rates must match.");
    if (!this.playing) {
      this.generation++;
      this.playing = true;
      this.endSent = false;
      this.startTime = null;
      this.endTime = null;
      this.onStart = [];
      this.post({
        type: "reset",
        generation: this.generation,
        rate: this.rate,
      });
    }
    if (onStart) this.onStart.push(onStart);
    this.post(
      {
        type: "audio",
        generation: this.generation,
        samples: new Int16Array(buffer),
      },
      [buffer],
    );
  }

  setPlaybackRate(rate: number) {
    if (
      !playbackRates.includes(rate as (typeof playbackRates)[number]) ||
      rate === this.rate
    )
      return;
    this.rate = rate;
    this.post({ type: "rate", generation: this.generation, rate });
  }

  async setPaused(paused: boolean) {
    this.observePlayback();
    this.paused = paused;
    if (!this.ctx || this.ctx.state === "closed") return;
    if (paused) await this.ctx.suspend();
    else await this.ctx.resume();
  }

  getSignal() {
    if (!this.analyser || !this.busy || this.ctx?.state !== "running")
      return { level: 0, low: 0, high: 0 };
    this.analyser.getFloatTimeDomainData(this.waveform);
    this.analyser.getByteFrequencyData(this.spectrum);
    let sum = 0,
      low = 0,
      high = 0;
    for (const value of this.waveform) sum += value * value;
    for (let i = 1; i < 16; i++) low += this.spectrum[i] ?? 0;
    for (let i = 32; i < 96; i++) high += this.spectrum[i] ?? 0;
    const rms = Math.sqrt(sum / this.waveform.length);
    return {
      level: rms < 0.003 ? 0 : Math.min(1, rms * 7),
      low: low / (15 * 255),
      high: high / (64 * 255),
    };
  }
  drain() {
    if (!this.busy) return Promise.resolve();
    const drained = new Promise<void>((resolve) => this.waiters.push(resolve));
    if (!this.endSent) {
      this.endSent = true;
      this.post({ type: "end", generation: this.generation });
    }
    return drained;
  }

  private resolveWaiters() {
    this.waiters.splice(0).forEach((resolve) => resolve());
  }

  stop() {
    if (this.startTimer) clearTimeout(this.startTimer);
    this.startTimer = null;
    this.generation++;
    this.playing = false;
    this.startTime = null;
    this.endTime = null;
    this.onStart = [];
    this.post({ type: "reset", generation: this.generation, rate: this.rate });
    this.resolveWaiters();
  }

  close() {
    this.stop();
    this.node?.disconnect();
    this.node?.port.close();
    this.node = null;
    this.initializing = null;
    this.analyser?.disconnect();
    this.analyser = null;
    this.ctx?.removeEventListener("statechange", this.observePlayback);
    void closeAudioContext(this.ctx);
    this.ctx = null;
  }
}
