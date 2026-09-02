export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private queue: Promise<void> = Promise.resolve();
  private nextStartTime = 0;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  async unlock(): Promise<void> {
    await this.getCtx().resume();
  }

  play(buffer: ArrayBuffer): Promise<void> {
    this.queue = this.queue.then(() => this._play(buffer));
    return this.queue;
  }

  private async _play(buffer: ArrayBuffer): Promise<void> {
    try {
      const ctx = this.getCtx();
      const decoded = await ctx.decodeAudioData(buffer.slice(0));

      await new Promise<void>((resolve) => {
        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.connect(ctx.destination);
        source.onended = () => resolve();
        source.start();
      });
    } catch (err) {
      console.error("[AudioPlayer] playback error:", err);
    }
  }

  playPcm16(buffer: ArrayBuffer, sampleRate = 24000) {
    try {
      const ctx = this.getCtx();
      const byteLength = buffer.byteLength - (buffer.byteLength % 2);
      const samples = new Int16Array(buffer.slice(0, byteLength));
      const audioBuffer = ctx.createBuffer(1, samples.length, sampleRate);
      const channel = audioBuffer.getChannelData(0);

      for (let i = 0; i < samples.length; i += 1) {
        channel[i] = (samples[i] ?? 0) / 32768;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const startTime = Math.max(ctx.currentTime, this.nextStartTime);
      source.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;
    } catch (err) {
      console.error("[AudioPlayer] PCM playback error:", err);
    }
  }

  // stop in-flight audio
  stop() {
    this.ctx?.close();
    this.ctx = null;
    this.queue = Promise.resolve();
    this.nextStartTime = 0;
  }
}
