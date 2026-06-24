export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private queue: Promise<void> = Promise.resolve();

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
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

  // stop in-flight audio
  stop() {
    this.ctx?.close();
    this.ctx = null;
    this.queue = Promise.resolve();
  }
}
