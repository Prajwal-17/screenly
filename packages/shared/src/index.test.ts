import { describe, expect, test } from "bun:test";
import {
  settingsSchema,
  feedbackSchema,
  finishInterviewSchema,
  interviewElapsedMs,
} from "./index";

describe("shared contracts", () => {
  test("finishing defaults to feedback and accepts an explicit skip", () => {
    expect(finishInterviewSchema.parse({}).generateFeedback).toBe(true);
    expect(
      finishInterviewSchema.parse({ generateFeedback: false }).generateFeedback,
    ).toBe(false);
    expect(
      finishInterviewSchema.safeParse({ generateFeedback: "false" }).success,
    ).toBe(false);
  });

  test("interview settings require valid topics and duration", () => {
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

test("elapsed time excludes pauses and stays fixed after completion", () => {
  const clock = {
    startedAt: 1000,
    endedAt: null,
    pausedAt: null as number | null,
    pausedMs: 2000,
  };
  expect(interviewElapsedMs(clock, 9000)).toBe(6000);
  expect(interviewElapsedMs({ ...clock, pausedAt: 8000 }, 900000)).toBe(5000);
  expect(interviewElapsedMs({ ...clock, endedAt: 10000 }, 900000)).toBe(7000);
  expect(interviewElapsedMs({ ...clock, startedAt: null }, 900000)).toBe(0);
});
