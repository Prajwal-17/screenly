import { afterEach, expect, spyOn, test } from "bun:test";
import type { InterviewDetail } from "@repo/shared";
import { readConfig } from "../src/config";
import { InvalidOpeningReplyError, LLMService } from "../src/lib/llmService";
import {
  liveMessages,
  LiveContextBudgetError,
} from "../src/lib/interviewContext";

const config = readConfig({
  BETTER_AUTH_SECRET: "test-secret-with-at-least-32-characters",
  LLM_API_KEY: "test-key",
  LLM_MODEL: "configured-model",
  LLM_BASE_URL: "https://model.example/v1",
});
const interview: InterviewDetail = {
  id: "readiness",
  status: "active",
  role: "Frontend",
  level: "Mid-level",
  topics: ["React"],
  duration: 20,
  phase: "opening",
  createdAt: 0,
  startedAt: null,
  endedAt: null,
  pausedAt: null,
  pausedMs: 0,
  feedbackStatus: "pending",
  feedback: null,
  feedbackModel: null,
  messages: [
    {
      id: "ready",
      role: "user",
      content: "I am ready",
      status: "complete",
      phase: "opening",
      createdAt: 1,
    },
  ],
};
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | undefined;
afterEach(() => fetchSpy?.mockRestore());
function reply(content: string) {
  fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [{ message: { role: "assistant", content } }],
      }),
      { headers: { "content-type": "application/json" } },
    ),
  );
}

test("HTTP 200 retirement text is a model configuration failure, not agreement to start", async () => {
  reply(
    "Gemini 3.5 Flash is no longer available. Please switch to Gemini 3.7 Flash in the latest version of Antigravity.",
  );
  const error = await new LLMService(config)
    .openingReply(interview, new AbortController().signal)
    .catch((e) => e);
  expect(error).toBeInstanceOf(InvalidOpeningReplyError);
  expect(error.code).toBe("INVALID_OPENING_RESPONSE");
  expect(error.model).toBe("configured-model");
  expect(error.message).not.toContain("Gemini");
});

test("a valid readiness decision permits the real questions phase", async () => {
  reply('{"ready":true,"text":""}');
  expect(
    await new LLMService(config).openingReply(
      interview,
      new AbortController().signal,
    ),
  ).toEqual({ ready: true, text: "" });
});

test("an invalid readiness shape cannot accidentally start the interview", async () => {
  reply('{"ready":"yes","text":""}');
  await expect(
    new LLMService(config).openingReply(
      interview,
      new AbortController().signal,
    ),
  ).rejects.toBeInstanceOf(InvalidOpeningReplyError);
});

test("streamed end tool arguments stay separate from spoken text", async () => {
  const prepared: InterviewDetail = {
    ...interview,
    phase: "questions",
    messages: [
      {
        ...interview.messages[0]!,
        phase: "questions",
        content: "Please end this interview now.",
      },
    ],
    preparation: {
      schemaVersion: 2,
      role: "Frontend",
      level: "Mid-level",
      rubricVersion: "screenly-rubric-2.0",
      promptVersion: "screenly-prompts-2.1",
      objectives: ["State and asynchronous UI"],
      priorFindings: [],
      warnings: [],
      memoryDegraded: false,
    },
  };
  const chunks = [
    { choices: [{ delta: { content: "Thanks for the conversation." } }] },
    {
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: "call-1",
                type: "function",
                function: {
                  name: "end_interview",
                  arguments: '{"reason":"candidate_',
                },
              },
            ],
          },
        },
      ],
    },
    {
      choices: [
        {
          delta: {
            tool_calls: [
              { index: 0, function: { arguments: 'requested_stop"}' } },
            ],
          },
        },
      ],
    },
    { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
  ];
  const body =
    chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") +
    "data: [DONE]\n\n";
  fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(body, {
      headers: { "content-type": "text/event-stream" },
    }),
  );
  const parts = [];
  for await (const part of new LLMService(config).generateReply(
    prepared,
    new AbortController().signal,
  ))
    parts.push(part);
  expect(parts).toEqual([
    "Thanks for the conversation.",
    { type: "end_interview", request: { reason: "candidate_requested_stop" } },
  ]);
});

test("malformed streamed end tool cannot become lifecycle authority", async () => {
  const { EndToolStream } = await import("../src/lib/interviewerTools");
  const tool = new EndToolStream();
  tool.add([
    {
      index: 0,
      id: "call-1",
      type: "function",
      function: {
        name: "end_interview",
        arguments: '{"reason":"coverage_complete","interviewId":"other"}',
      },
    },
  ]);
  expect(() => tool.finish()).toThrow();
});

test("one observation and one end request share a stream without speaking tool JSON", async () => {
  const { EndToolStream } = await import("../src/lib/interviewerTools");
  const tool = new EndToolStream();
  tool.add([
    {
      index: 0,
      id: "observation",
      type: "function",
      function: {
        name: "record_interview_observation",
        arguments: JSON.stringify({
          objective: "State and asynchronous UI",
          situation: "A screen loads data.",
          constraints: [],
          unresolvedPoints: [],
          sourceMessageIds: ["ready"],
          objectiveEvidence: [],
          hint: null,
          constraintChange: null,
        }),
      },
    },
    {
      index: 1,
      id: "ending",
      type: "function",
      function: {
        name: "end_interview",
        arguments: '{"reason":"coverage_complete"}',
      },
    },
  ]);
  expect(tool.finish()).toMatchObject({
    observation: { objective: "State and asynchronous UI" },
    end: { reason: "coverage_complete" },
  });
  const duplicate = new EndToolStream();
  duplicate.add([
    {
      index: 0,
      id: "a",
      type: "function",
      function: { name: "record_interview_observation", arguments: "{}" },
    },
    {
      index: 1,
      id: "b",
      type: "function",
      function: { name: "record_interview_observation", arguments: "{}" },
    },
  ]);
  expect(() => duplicate.finish()).toThrow();
  const unknown = new EndToolStream();
  unknown.add([
    {
      index: 0,
      id: "c",
      type: "function",
      function: { name: "change_score", arguments: "{}" },
    },
  ]);
  expect(() => unknown.finish()).toThrow();
});

test("oversize live context fails without truncating the saved explanation", () => {
  const explanation = "x".repeat(96_000);
  const oversized: InterviewDetail = {
    ...interview,
    phase: "questions",
    messages: [
      { ...interview.messages[0]!, phase: "questions", content: explanation },
    ],
  };
  expect(() => liveMessages(oversized)).toThrow(LiveContextBudgetError);
  expect(oversized.messages[0]?.content).toBe(explanation);
});
