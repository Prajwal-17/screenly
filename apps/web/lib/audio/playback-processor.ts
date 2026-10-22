import { SpeechTempo } from "./speech-tempo";

// AudioWorklet globals are separate from the main-thread DOM type definitions.
declare const sampleRate: number;
declare const currentFrame: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(
  name: string,
  processor: typeof AudioWorkletProcessor,
): void;

export type PlaybackCommand =
  | { type: "reset"; generation: number; rate: number }
  | { type: "rate"; generation: number; rate: number }
  | { type: "audio"; generation: number; samples: Int16Array }
  | { type: "end"; generation: number };

export type PlaybackEvent = {
  type: "started" | "ended";
  generation: number;
  time: number;
};

class PlaybackProcessor extends AudioWorkletProcessor {
  private stream = new SpeechTempo(sampleRate);
  private generation = 0;
  private started = false;
  private ended = false;

  constructor() {
    super();
    this.port.onmessage = ({ data }: MessageEvent<PlaybackCommand>) => {
      if (data.type === "reset") {
        if (data.generation < this.generation) return;
        this.generation = data.generation;
        this.stream = new SpeechTempo(sampleRate);
        this.stream.setRate(data.rate);
        this.started = false;
        this.ended = false;
      } else if (data.generation === this.generation) {
        if (data.type === "audio") this.stream.enqueue(data.samples);
        if (data.type === "rate") this.stream.setRate(data.rate);
        if (data.type === "end") this.stream.end();
      }
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]) {
    const output = outputs[0]?.[0];
    if (!output) return true;
    const written = this.stream.render(output);
    if (!this.started) {
      const audible = output.findIndex((value) => Math.abs(value) > 0.000001);
      if (audible >= 0) {
        this.started = true;
        this.port.postMessage({
          type: "started",
          generation: this.generation,
          time: (currentFrame + audible) / sampleRate,
        } satisfies PlaybackEvent);
      }
    }
    if (!this.ended && this.stream.finished) {
      this.ended = true;
      this.port.postMessage({
        type: "ended",
        generation: this.generation,
        time: (currentFrame + written) / sampleRate,
      } satisfies PlaybackEvent);
    }
    return true;
  }
}
registerProcessor("speech-playback", PlaybackProcessor);
