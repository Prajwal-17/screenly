import { SpeechCaptions } from "@repo/shared";
import { closeAudioContext } from "./audio-context";
export type SpeechSegment = { text: string; duration: number };
export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private nextTime = 0;
  private waiters: (() => void)[] = [];
  private spans: { start: number; duration: number }[] = [];
  private scheduled = 0;
  private played = 0;
  private captions = new SpeechCaptions();
  private caption = "";
  private animation: number | null = null;
  constructor(private onCaption: (text: string) => void = () => {}) {}
  async unlock() {
    this.ctx ??= new AudioContext();
    await this.ctx.resume();
  }
  get busy() {
    return this.sources.size > 0 || this.spans.length > 0;
  }
  playPcm16(buffer: ArrayBuffer, segment?: SpeechSegment, sampleRate = 24000) {
    if (!this.ctx || buffer.byteLength < 2) return;
    const samples = new Int16Array(buffer);
    const audio = this.ctx.createBuffer(1, samples.length, sampleRate);
    const channel = audio.getChannelData(0);
    for (let i = 0; i < samples.length; i++)
      channel[i] = (samples[i] ?? 0) / 32768;
    const source = this.ctx.createBufferSource();
    source.buffer = audio;
    source.connect(this.ctx.destination);
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
    };
    const start = Math.max(this.ctx.currentTime, this.nextTime);
    if (segment)
      this.captions.add(segment.text, this.scheduled, segment.duration);
    this.spans.push({ start, duration: audio.duration });
    this.scheduled += audio.duration;
    source.start(start);
    this.nextTime = start + audio.duration;
    this.followPlayback();
  }
  private followPlayback() {
    if (this.animation !== null) return;
    const tick = () => {
      if (!this.ctx) return;
      // Count played samples rather than wall time: queued audio, network gaps,
      // and a suspended audio device must not advance the caption.
      const now = this.ctx.currentTime - (this.ctx.outputLatency || 0);
      while (
        this.spans[0] &&
        now >= this.spans[0].start + this.spans[0].duration
      )
        this.played += this.spans.shift()!.duration;
      const active = this.spans[0];
      const played =
        this.played + (active ? Math.max(0, now - active.start) : 0);
      const caption = this.captions.at(played);
      if (caption !== this.caption) {
        this.caption = caption;
        this.onCaption(caption);
      }
      if (this.busy) this.animation = requestAnimationFrame(tick);
      else {
        this.animation = null;
        this.resolveWaiters();
      }
    };
    this.animation = requestAnimationFrame(tick);
  }
  drain() {
    if (!this.busy) return Promise.resolve();
    return new Promise<void>((resolve) => this.waiters.push(resolve));
  }
  private resolveWaiters() {
    this.waiters.splice(0).forEach((resolve) => resolve());
  }
  stop() {
    if (this.animation !== null) cancelAnimationFrame(this.animation);
    this.animation = null;
    this.sources.forEach((source) => {
      source.onended = null;
      source.stop();
      source.disconnect();
    });
    this.sources.clear();
    this.spans = [];
    this.nextTime = 0;
    this.played = 0;
    this.scheduled = 0;
    this.captions = new SpeechCaptions();
    this.caption = "";
    this.resolveWaiters();
  }
  close() {
    this.stop();
    void closeAudioContext(this.ctx);
    this.ctx = null;
  }
}
