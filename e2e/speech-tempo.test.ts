import { describe, expect, test } from "bun:test";
import { SpeechTempo } from "../apps/web/lib/audio/speech-tempo";

const sampleRate = 24000;
function voice(seconds = 3, frequency = 196) {
  return Int16Array.from(
    { length: Math.round(sampleRate * seconds) },
    (_, i) => {
      const phase = (2 * Math.PI * frequency * i) / sampleRate;
      const envelope = Math.min(1, i / 240, (sampleRate * seconds - i) / 240);
      return Math.round(
        32767 *
          envelope *
          (0.45 * Math.sin(phase) +
            0.2 * Math.sin(phase * 2) +
            0.1 * Math.sin(phase * 3)),
      );
    },
  );
}
function pitch(samples: Float32Array) {
  const start = Math.floor(samples.length / 3);
  const length = Math.min(6000, Math.floor(samples.length / 3));
  const correlations = new Float64Array(240);
  for (let offset = 24; offset < correlations.length; offset++) {
    for (let i = 0; i < length; i++)
      correlations[offset] +=
        samples[start + i]! * samples[start + i + offset]!;
  }
  const peak = Math.max(...correlations);
  let lag = correlations.indexOf(peak);
  // Choose the first full-period peak, not a later multiple that can disguise
  // an octave shift as the original fundamental.
  for (let offset = 25; offset < correlations.length - 1; offset++) {
    if (
      correlations[offset]! >= peak * 0.98 &&
      correlations[offset]! >= correlations[offset - 1]! &&
      correlations[offset]! > correlations[offset + 1]!
    ) {
      lag = offset;
      break;
    }
  }
  return sampleRate / lag;
}
function finish(stream: SpeechTempo) {
  stream.end();
  const result: number[] = [];
  const block = new Float32Array(128);
  for (let i = 0; !stream.finished && i < 10000; i++) {
    const written = stream.render(block);
    expect(written).toBeGreaterThan(0);
    result.push(...block.subarray(0, written));
  }
  expect(stream.finished).toBe(true);
  return Float32Array.from(result);
}

describe("pitch-preserving streaming speech", () => {
  test("the pitch measurement detects the octave shift caused by 2× resampling", () => {
    const shifted = Float32Array.from(
      voice().filter((_, i) => i % 2 === 0),
      (sample) => sample / 32768,
    );
    expect(Math.abs(pitch(shifted) - 392)).toBeLessThan(4);
  });
  for (const rate of [1, 1.25, 1.5, 2]) {
    test(`${rate}× changes duration while retaining vocal pitch across packet boundaries`, () => {
      const stream = new SpeechTempo(sampleRate);
      stream.setRate(rate);
      const input = voice();
      for (let offset = 0; offset < input.length; offset += 317)
        stream.enqueue(input.slice(offset, offset + 317));
      const output = finish(stream);
      expect(Math.abs(output.length - input.length / rate)).toBeLessThanOrEqual(
        1,
      );
      expect(Math.abs(pitch(output) - 196)).toBeLessThan(2);
      expect(output.every(Number.isFinite)).toBe(true);
      expect(Math.max(...output.slice(-2400).map(Math.abs))).toBeGreaterThan(
        0.3,
      );
    });
  }
  test("plays streamed input before the reply finishes, with less than 120 ms lookahead", () => {
    const stream = new SpeechTempo(sampleRate);
    stream.setRate(2);
    const input = voice(1);
    const block = new Float32Array(128);
    stream.enqueue(input.slice(0, 480));
    expect(stream.render(block)).toBe(0);
    stream.enqueue(input.slice(480, 2880));
    expect(stream.render(block)).toBe(128);
    expect(block.some((sample) => Math.abs(sample) > 0.01)).toBe(true);
    expect(stream.finished).toBe(false);
  });
  test("speed changes retain pitch and continuity without restarting queued speech", () => {
    const stream = new SpeechTempo(sampleRate);
    stream.enqueue(voice());
    const block = new Float32Array(128);
    const before: number[] = [];
    for (let i = 0; i < 80; i++) {
      stream.render(block);
      before.push(...block);
    }
    stream.setRate(2);
    const after = finish(stream);
    expect(Math.abs(pitch(Float32Array.from(before)) - 196)).toBeLessThan(2);
    expect(Math.abs(pitch(after) - 196)).toBeLessThan(2);
    expect(after.length).toBeLessThan(sampleRate * 1.5);
    const boundary = Float32Array.from([
      ...before.slice(-2400),
      ...after.slice(0, 2400),
    ]);
    let step = 0;
    for (let i = 1; i < boundary.length; i++)
      step = Math.max(step, Math.abs(boundary[i]! - boundary[i - 1]!));
    expect(step).toBeLessThan(0.2);
  });
  test("temporary input starvation retains unfinished audio for subsequent packets", () => {
    const stream = new SpeechTempo(sampleRate);
    stream.setRate(1.5);
    const input = voice(1);
    stream.enqueue(input.slice(0, 1600));
    const block = new Float32Array(128);
    for (let i = 0; i < 60; i++) stream.render(block);
    expect(stream.finished).toBe(false);
    stream.enqueue(input.slice(1600));
    const output = finish(stream);
    expect(output.length).toBeGreaterThan(sampleRate / 2);
    expect(Math.abs(pitch(output) - 196)).toBeLessThan(2);
  });
});
