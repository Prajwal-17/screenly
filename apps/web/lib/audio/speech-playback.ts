import { SpeechTempo } from "./speech-tempo";
import { playbackRates } from "./playback-rates";

// Keep a small playout reserve in addition to WSOLA's processing lookahead.
// Otherwise each late network packet becomes silence in the middle of a word.
export class SpeechPlayback {
  private readonly tempo: SpeechTempo;
  private rate = 1;
  private buffering = true;
  private reserveSeconds = 0.16;
  private ended = false;

  constructor(sampleRate: number) {
    this.tempo = new SpeechTempo(sampleRate);
  }

  setRate(rate: number) {
    if (!playbackRates.includes(rate as (typeof playbackRates)[number])) return;
    this.rate = rate;
    this.tempo.setRate(rate);
  }

  enqueue(samples: Int16Array) {
    this.tempo.enqueue(samples);
  }

  end() {
    this.ended = true;
    this.tempo.end();
  }

  get finished() {
    return this.tempo.finished;
  }

  get playedSeconds() {
    return this.tempo.playedSeconds;
  }

  render(destination: Float32Array) {
    if (this.buffering && !this.ended) {
      const required =
        this.tempo.lookaheadSeconds + this.rate * this.reserveSeconds;
      if (this.tempo.bufferedSeconds < required) {
        destination.fill(0);
        return 0;
      }
    }
    this.buffering = false;
    const written = this.tempo.render(destination);
    if (!this.ended && written < destination.length) {
      // After an underrun, accumulate a larger reserve instead of playing each
      // tiny arriving fragment immediately. Never discard or skip source audio.
      this.reserveSeconds = Math.min(0.4, this.reserveSeconds + 0.08);
      this.buffering = true;
    }
    return written;
  }
}
