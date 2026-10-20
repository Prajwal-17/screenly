/* global AudioWorkletProcessor, registerProcessor */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Silero v5 classifies 32 ms of mono, 16 kHz float audio locally.
    this.buffer = new Float32Array(512);
    this.index = 0;
    this.energy = 0;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    for (const sample of input) {
      const value = Math.max(-1, Math.min(1, sample));
      this.energy += value * value;
      this.buffer[this.index++] = value;
      if (this.index === this.buffer.length) {
        const samples = Float32Array.from(this.buffer);
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
