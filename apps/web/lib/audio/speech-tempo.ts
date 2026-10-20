import {
  CircularSampleBuffer,
  FifoSampleBuffer,
  Stretch,
} from "@soundtouchjs/core";

import { playbackRates } from "./playback-rates";

// WSOLA changes the time between speech segments without resampling their pitch.
// Keep the lookahead bounded and process at most one window at a time so a large
// incoming TTS burst cannot monopolize the audio rendering thread.
export class SpeechTempo {
  private readonly queued = new CircularSampleBuffer();
  private readonly input = new FifoSampleBuffer();
  private readonly output = new FifoSampleBuffer();
  private readonly stretch: Stretch;
  private readonly window: Float32Array;
  private readonly samples = new Float32Array(256);
  private received = 0;
  private consumed = 0;
  private rate = 1;
  private outputRate = 1;
  private ended = false;

  constructor(readonly sampleRate: number) {
    this.stretch = new Stretch({ sampleRate });
    this.stretch.inputBuffer = this.input;
    this.stretch.outputBuffer = this.output;
    this.stretch.setStretchParameters({
      sequenceMs: 50,
      seekWindowMs: 15,
      overlapMs: 8,
      quickSeek: false,
    });
    this.window = new Float32Array(Math.ceil(sampleRate * 0.15) * 2);
  }

  setRate(rate: number) {
    if (!playbackRates.includes(rate as (typeof playbackRates)[number])) return;
    this.rate = rate;
    this.stretch.tempo = rate;
  }

  enqueue(samples: Int16Array) {
    const stereo = new Float32Array(samples.length * 2);
    for (let i = 0; i < samples.length; i++) {
      const sample = (samples[i] ?? 0) / 32768;
      stereo[i * 2] = sample;
      stereo[i * 2 + 1] = sample;
    }
    this.queued.putSamples(stereo);
    this.received += samples.length;
  }

  end() {
    this.ended = true;
  }

  get finished() {
    return this.ended && this.consumed >= this.received;
  }

  render(destination: Float32Array) {
    destination.fill(0);
    let written = 0;
    while (written < destination.length && this.consumed < this.received) {
      if (!this.output.frameCount) {
        const needed = Math.max(
          0,
          this.stretch.sampleReq +
            this.stretch.overlapLength -
            this.input.frameCount,
        );
        const available = Math.min(needed, this.queued.frameCount);
        this.queued.extract(this.window, 0, available);
        this.queued.receive(available);
        this.input.putSamples(this.window, 0, available);
        if (this.ended && available < needed) {
          // Flush lookahead with silence, then crop it to the real speech budget.
          this.window.fill(0, 0, (needed - available) * 2);
          this.input.putSamples(this.window, 0, needed - available);
        }
        this.stretch.process();
        this.outputRate = this.rate;
        if (!this.output.frameCount) break;
      }
      const count = Math.min(
        destination.length - written,
        this.output.frameCount,
        this.samples.length / 2,
        Math.ceil((this.received - this.consumed) / this.outputRate),
      );
      this.output.extract(this.samples, 0, count);
      this.output.receive(count);
      for (let i = 0; i < count; i++)
        destination[written + i] = this.samples[i * 2] ?? 0;
      this.consumed += count * this.outputRate;
      written += count;
    }
    return written;
  }
}
