import { expect, test } from "bun:test";
import {
  SpeechGate,
  VAD_FRAME_SAMPLES,
} from "../apps/web/lib/audio/speech-gate";

test("speech streams during the answer, retains word endings, and finalizes in 640ms", () => {
  const uploaded: Float32Array[] = [];
  const events: string[] = [];
  let endings = 0;
  const gate = new SpeechGate(
    (frame) => {
      uploaded.push(frame);
      events.push("audio");
    },
    () => endings++,
    () => events.push("start"),
  );
  const frame = () => new Float32Array(VAD_FRAME_SAMPLES).fill(0.1);
  for (let i = 0; i < 8; i++) gate.process(frame(), 0);
  expect(uploaded).toHaveLength(0);
  for (let i = 0; i < 3; i++) gate.process(frame(), 0.9);
  expect(uploaded.length).toBeGreaterThan(0); // No whole-answer buffer.
  expect(events[0]).toBe("start"); // Cancel the old reply before sending new PCM.
  expect(events.filter((event) => event === "start")).toHaveLength(1);
  const before = uploaded.length;
  for (let i = 0; i < 19; i++) gate.process(frame(), 0);
  expect(endings).toBe(0);
  expect(uploaded.length - before).toBe(12); // 384ms of trailing audio, then no uploads.
  gate.process(frame(), 0);
  expect(endings).toBe(1);
  const stopped = uploaded.length;
  for (let i = 0; i < 60; i++) gate.process(frame(), 0);
  expect(uploaded).toHaveLength(stopped);
  expect(endings).toBe(1);
  for (let i = 0; i < 3; i++) gate.process(frame(), 0.9);
  expect(events.filter((event) => event === "start")).toHaveLength(2);
});

test("a short thinking pause stays in the same answer without duplicating audio", () => {
  const uploaded: Float32Array[] = [];
  let endings = 0;
  const gate = new SpeechGate(
    (frame) => uploaded.push(frame),
    () => endings++,
  );
  const push = (probability: number) =>
    gate.process(new Float32Array(VAD_FRAME_SAMPLES), probability);
  for (let i = 0; i < 10; i++) push(0.9);
  for (let i = 0; i < 15; i++) push(0); // 480ms pause.
  push(0.9);
  expect(endings).toBe(0);
  expect(new Set(uploaded).size).toBe(uploaded.length);
  for (let i = 0; i < 20; i++) push(0);
  expect(endings).toBe(1);
});
