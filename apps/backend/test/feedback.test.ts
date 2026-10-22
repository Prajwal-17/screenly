import { expect, test, vi } from "vitest";
import type { Feedback, InterviewMessage } from "@repo/shared";
import { normalizeStoredFeedback } from "../src/db/interviews";
import { LLMService, parseFeedback } from "../src/lib/llmService";
import { config } from "./runtime";
import { emptyProfile, type InterviewDetail } from "@repo/shared";
import {
  interviewCandidate,
  interviewWelcome,
} from "../src/lib/interviewOpening";

test("opening and technical requests receive candidate context while feedback receives only technical evidence", async () => {
  const requests: {
    messages: { role: string; content: string }[];
    model: string;
    reasoning_effort: string;
    max_tokens: number;
  }[] = [];
  let response = JSON.stringify({
    ready: false,
    text: "Take your time. Let me know when you’re ready.",
  });
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input, init) => {
      const request = new Request(input, init);
      requests.push(await request.json());
      return new Response(
        JSON.stringify({ choices: [{ message: { content: response } }] }),
        { headers: { "Content-Type": "application/json" } },
      );
    });
  const interview: InterviewDetail = {
    id: "opening-test",
    role: "Frontend",
    level: "Mid-level",
    topics: ["React"],
    duration: 10,
    status: "active",
    phase: "opening",
    createdAt: 1,
    startedAt: null,
    endedAt: null,
    feedbackStatus: "pending",
    feedback: null,
    feedbackModel: null,
    candidate: interviewCandidate({
      ...emptyProfile("Maya Chen"),
      stack: ["React", "TypeScript"],
      goal: "Explain trade-offs",
    }),
    messages: [
      {
        ...message,
        id: "readiness",
        content: "Not ready yet.",
        phase: "opening",
      },
    ],
  };
  try {
    const service = new LLMService({
      ...config,
      LLM_API_KEY: "fixture-key",
      LLM_MODEL: "feedback-model",
      LLM_INTERVIEW_MODEL: "interview-model",
      LLM_INTERVIEW_REASONING_EFFORT: "low",
      LLM_INTERVIEW_MAX_TOKENS: 512,
    });
    expect(interviewWelcome(interview)).toContain("Hi Maya.");
    expect(interviewWelcome(interview)).toContain("React and TypeScript");
    expect(interviewWelcome({ ...interview, candidate: null })).toContain(
      "Hi there.",
    );
    expect(
      await service.openingReply(interview, new AbortController().signal),
    ).toEqual(JSON.parse(response));
    const openingRequest = requests.at(-1)!;
    expect(openingRequest).toMatchObject({
      model: "interview-model",
      reasoning_effort: "low",
      max_tokens: 512,
    });
    expect(
      JSON.parse(openingRequest.messages.at(-1)!.content).candidateContext,
    ).toEqual(interview.candidate);
    for (const invalid of [
      '{"ready":"true","text":""}',
      '{"ready":true,"text":"A question"}',
      "{}",
      "not json",
    ]) {
      response = invalid;
      await expect(
        service.openingReply(interview, new AbortController().signal),
      ).rejects.toThrow();
    }
    response = JSON.stringify(report);
    await service.evaluate({
      ...interview,
      messages: [...interview.messages, message],
    });
    expect(
      JSON.parse(requests.at(-1)!.messages.at(-1)!.content).transcript,
    ).toEqual([message]);

    fetch.mockImplementation(async (input, init) => {
      requests.push(await new Request(input, init).json());
      return new Response(
        'data: {"choices":[{"delta":{"content":"First question."}}]}\n\ndata: [DONE]\n\n',
        { headers: { "Content-Type": "text/event-stream" } },
      );
    });
    let text = "";
    for await (const chunk of service.generateReply(
      { ...interview, phase: "questions" },
      new AbortController().signal,
    ))
      text += chunk;
    expect(text).toBe("First question.");
    expect(
      requests
        .at(-1)!
        .messages.some((entry) =>
          entry.content.includes('"goal":"Explain trade-offs"'),
        ),
    ).toBe(true);
    expect(requests.at(-1)!.messages.at(-1)!.content).toBe(
      "[Opening phase] Not ready yet.",
    );
  } finally {
    fetch.mockRestore();
  }
});
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
test("readiness and profile conversation cannot count as answers or be referenced in feedback", () => {
  const opening = {
    ...message,
    id: "readiness",
    content: "Yes, ready.",
    phase: "opening" as const,
  };
  const result = parseFeedback(JSON.stringify(report), [opening, message]);
  expect(result.overallScore).toBeNull();
  expect(
    parseFeedback(JSON.stringify(report), [opening]).dimensions.every(
      (d) => d.score === null,
    ),
  ).toBe(true);
  expect(() =>
    parseFeedback(
      JSON.stringify({
        ...report,
        answers: [
          {
            messageId: opening.id,
            observation: "Ready",
            suggestion: "Practice",
          },
        ],
      }),
      [opening, message],
    ),
  ).toThrow("unknown answer");
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
