export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private nextTime = 0;
  private waiters: (() => void)[] = [];
  async unlock() {
    this.ctx ??= new AudioContext();
    await this.ctx.resume();
  }
  get busy() {
    return this.sources.size > 0;
  }
  playPcm16(buffer: ArrayBuffer, sampleRate = 24000) {
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
      if (!this.busy) this.resolveWaiters();
    };
    const start = Math.max(this.ctx.currentTime, this.nextTime);
    source.start(start);
    this.nextTime = start + audio.duration;
  }
  drain() {
    if (!this.busy) return Promise.resolve();
    return new Promise<void>((resolve) => this.waiters.push(resolve));
  }
  private resolveWaiters() {
    this.waiters.splice(0).forEach((resolve) => resolve());
  }
  stop() {
    this.sources.forEach((source) => {
      source.onended = null;
      source.stop();
      source.disconnect();
    });
    this.sources.clear();
    this.nextTime = 0;
    this.resolveWaiters();
  }
  close() {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}
