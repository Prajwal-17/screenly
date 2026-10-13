import { expect, test } from "bun:test";
import type { Feedback, InterviewMessage } from "@repo/shared";
import { parseFeedback } from "../src/lib/llmService";
const message: InterviewMessage = {
  id: "candidate-answer",
  role: "user",
  content: "I would test the visible behavior.",
  status: "complete",
  createdAt: 1,
};
const report: Feedback = {
  summary: "A brief interview.",
  overallScore: 90,
  dimensions: [
    "Technical accuracy",
    "Depth & trade-offs",
    "Problem solving",
    "Communication",
  ].map((name) => ({
    name: name as Feedback["dimensions"][number]["name"],
    score: 80,
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
  ).toBe(90);
});
