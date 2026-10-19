import { expect, test } from "vitest";
import type { Feedback, InterviewMessage } from "@repo/shared";
import { normalizeStoredFeedback } from "../src/db/interviews";
import { parseFeedback } from "../src/lib/llmService";
const message: InterviewMessage = {
  id: "candidate-answer",
  role: "user",
  content: "I would test the visible behavior.",
  status: "complete",
  createdAt: 1,
};
const report: Feedback = {
  scoreScale: 10,
  summary: "A brief interview.",
  overallScore: 9,
  dimensions: [
    "Technical accuracy",
    "Depth & trade-offs",
    "Problem solving",
    "Communication",
  ].map((name) => ({
    name: name as Feedback["dimensions"][number]["name"],
    score: 8,
    explanation: "Evidence from the conversation.",
  })),
  strengths: [],
  improvements: [],
  answers: [],
  nextSteps: [
    "Practice examples.",
    "Discuss trade-offs.",
    "Test failure states.",
  ],
};
test("feedback rejects invented answer references and invalid JSON", () => {
  expect(() =>
    parseFeedback(
      JSON.stringify({
        ...report,
        answers: [
          {
            messageId: "invented-id",
            observation: "Example",
            suggestion: "Example",
          },
        ],
      }),
      [message],
    ),
  ).toThrow("unknown answer");
  expect(() => parseFeedback("This is not JSON", [message])).toThrow();
});
test("insufficient evidence suppresses scores instead of inventing certainty", () => {
  expect(
    parseFeedback(JSON.stringify(report), [message]).overallScore,
  ).toBeNull();
  const empty = parseFeedback(JSON.stringify(report), []);
  expect(empty.dimensions.every((d) => d.score === null)).toBe(true);
  expect(
    parseFeedback(JSON.stringify(report), [
      message,
      { ...message, id: "second-answer" },
    ]).overallScore,
  ).toBe(9);
});

test("scores use the 10-point scale and reject percentages", () => {
  const messages = [message, { ...message, id: "second-answer" }];
  const parsed = parseFeedback(
    JSON.stringify({ ...report, overallScore: 7.8 }),
    messages,
  );
  expect(parsed.overallScore).toBe(7.8);
  expect(parsed.scoreScale).toBe(10);
  for (const score of [-1, 10.1, 78, 7.85]) {
    expect(() =>
      parseFeedback(
        JSON.stringify({ ...report, overallScore: score }),
        messages,
      ),
    ).toThrow();
  }
  expect(() =>
    parseFeedback(
      JSON.stringify({
        ...report,
        dimensions: report.dimensions.map((d) => ({ ...d, score: 80 })),
      }),
      messages,
    ),
  ).toThrow();
});
test("saved percentage reports convert once, including low scores and nulls", () => {
  const legacy = { ...report, scoreScale: undefined };
  const normalized = normalizeStoredFeedback({
    ...legacy,
    overallScore: 78,
    dimensions: legacy.dimensions.map((d, i) => ({
      ...d,
      score: i === 0 ? null : i === 1 ? 8 : 80,
    })),
  })!;
  expect(normalized.overallScore).toBe(7.8);
  expect(normalized.dimensions.map((d) => d.score)).toEqual([null, 0.8, 8, 8]);
  expect(normalizeStoredFeedback(normalized)).toEqual(normalized);
  expect(
    normalizeStoredFeedback({ ...legacy, overallScore: null })?.overallScore,
  ).toBeNull();
  expect(normalizeStoredFeedback(null)).toBeNull();
});
