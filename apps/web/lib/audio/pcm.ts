/** Copy the exact PCM view into owned storage before the capture buffer is reused. */
export function copyPcmBytes(samples: Int16Array): ArrayBuffer {
  return samples.slice().buffer;
}
