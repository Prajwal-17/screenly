import { expect, test } from "@playwright/test";
import { copyPcmBytes } from "../../lib/audio/pcm";

test("buffered microphone PCM preserves signed 16-bit bytes and view boundaries", () => {
  const storage = new Int16Array([99, 0x1234, -1, -32768, 32767, 88]);
  const samples = storage.subarray(1, 5);
  const originalBytes = Array.from(
    new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength),
  );
  const buffered = copyPcmBytes(samples);
  expect(buffered.byteLength).toBe(8);
  expect(Array.from(new Uint8Array(buffered))).toEqual(originalBytes);
  expect(Array.from(new Int16Array(buffered))).toEqual([
    0x1234, -1, -32768, 32767,
  ]);
  storage.fill(0);
  expect(Array.from(new Uint8Array(buffered))).toEqual(originalBytes);
});
