import { describe, expect, test } from "bun:test";
import {
  packAudio,
  unpackAudio,
  settingsSchema,
  feedbackSchema,
  clientEventSchema,
} from "./index";
describe("shared contracts", () => {
  test("validates voice and typed starts and bounded, identifiable text answers", () => {
    expect(clientEventSchema.safeParse({ type: "start" }).success).toBe(true);
    expect(
      clientEventSchema.safeParse({ type: "start", typed: true }).success,
    ).toBe(true);
    expect(
      clientEventSchema.safeParse({ type: "start", voice: false }).success,
    ).toBe(false);
    const answer = {
      type: "answer",
      id: crypto.randomUUID(),
      text: "An answer",
    };
    expect(clientEventSchema.safeParse(answer).success).toBe(true);
    expect(
      clientEventSchema.safeParse({ ...answer, id: "invalid" }).success,
    ).toBe(false);
    expect(clientEventSchema.safeParse({ ...answer, text: "  " }).success).toBe(
      false,
    );
    expect(
      clientEventSchema.safeParse({ ...answer, text: "x".repeat(12001) })
        .success,
    ).toBe(false);
  });
  test("audio preserves the reply ID and PCM samples", () => {
    const pcm = new Int16Array([-32768, 0, 32767]);
    const frame = packAudio(4294967294, new Uint8Array(pcm.buffer));
    const parsed = unpackAudio(frame.buffer)!;
    expect(parsed.responseId).toBe(4294967294);
    expect(Array.from(new Int16Array(parsed.audio))).toEqual(Array.from(pcm));
    expect(unpackAudio(new ArrayBuffer(3))).toBeNull();
  });
  test("rejects empty, repeated, or excessive topics", () => {
    const base = { role: "Frontend", level: "Junior", duration: 10 };
    expect(settingsSchema.safeParse({ ...base, topics: [] }).success).toBe(
      false,
    );
    expect(
      settingsSchema.safeParse({ ...base, topics: ["React", "React"] }).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({ ...base, topics: ["React"] }).success,
    ).toBe(true);
    expect(
      settingsSchema.safeParse({ ...base, duration: 999, topics: ["React"] })
        .success,
    ).toBe(false);
  });
  test("feedback must cover each rubric dimension once", () => {
    const item = {
      name: "Technical accuracy",
      score: 5,
      explanation: "Some evidence",
    };
    expect(
      feedbackSchema.safeParse({
        summary: "Example",
        overallScore: 5,
        dimensions: [item, item, item, item],
        strengths: [],
        improvements: [],
        answers: [],
        nextSteps: ["one", "two", "three"],
      }).success,
    ).toBe(false);
  });
});
