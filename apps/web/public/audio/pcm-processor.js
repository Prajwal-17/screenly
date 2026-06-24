/* global AudioWorkletProcessor, registerProcessor */

/**
 * This is a pcm processor which handle all pcm calculation off the frontend which is required for AudioWorklet
 * This run on a separate thread
 * This must me a separate file in /public due to browser's worklet security isolation
 * calculation
 * chunkMs = (chunkSize / sampleRate) * 1000
 * chunkSize = sampleRate * chunkMs / 1000
 * `const pcm16 = s < 0 ? s * 0x8000 : s * 0x7fff;` is a standard calculation from Float32Array to Int16Array
 * have to `return true` to keep the processor alive - to call `process()` from next audio block
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // persistent buffer across many process() calls
    this.chunkSize = 1600; // 100ms at 16kHz
    this.buffer = new Int16Array(this.chunkSize);
    this.writeIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const floatSamples = input[0];

    for (let i = 0; i < floatSamples.length; i++) {
      const s = Math.max(-1, Math.min(1, floatSamples[i]));
      const pcm16 = s < 0 ? s * 0x8000 : s * 0x7fff;

      this.buffer[this.writeIndex++] = pcm16;

      if (this.writeIndex === this.chunkSize) {
        /**
         * const chunk = new Int16Array(this.buffer);
         * using `new Int16Array(this.buffer) create a new view existing buffer` and not a copy
         * coz they share the same underlying ArrayBuffer
         */
        const chunk = Int16Array.from(this.buffer);
        this.port.postMessage({ type: "pcm-chunk", samples: chunk }, [
          chunk.buffer,
        ]);

        this.writeIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
