/* global AudioWorkletProcessor, registerProcessor */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Deepgram recommends 80 ms chunks at 16 kHz for Flux turn detection.
    this.buffer = new Int16Array(1280);
    this.index = 0;
    this.energy = 0;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    for (const sample of input) {
      const value = Math.max(-1, Math.min(1, sample));
      this.energy += value * value;
      this.buffer[this.index++] = value < 0 ? value * 32768 : value * 32767;
      if (this.index === this.buffer.length) {
        const samples = Int16Array.from(this.buffer);
        this.port.postMessage(
          {
            type: "pcm-chunk",
            samples,
            level: Math.min(1, Math.sqrt(this.energy / this.buffer.length) * 5),
          },
          [samples.buffer],
        );
        this.index = 0;
        this.energy = 0;
      }
    }
    return true;
  }
}
registerProcessor("pcm-processor", PCMProcessor);
