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

test("the first question is requested without observation or end tools", async () => {
  const prepared: InterviewDetail = {
    ...interview,
    phase: "questions",
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
    { choices: [{ delta: { content: "How would you manage shared state?" } }] },
    { choices: [{ delta: {}, finish_reason: "stop" }] },
  ];
  fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") +
        "data: [DONE]\n\n",
      { headers: { "content-type": "text/event-stream" } },
    ),
  );
  const parts = [];
  for await (const part of new LLMService(config).generateReply(
    prepared,
    new AbortController().signal,
  ))
    parts.push(part);
  const [input, init] = fetchSpy.mock.calls[0]!;
  const requestBody = (await new Request(input, init).json()) as Record<
    string,
    unknown
  >;
  expect(requestBody.tools).toBeUndefined();
  expect(parts).toEqual(["How would you manage shared state?"]);
});

test("a tool-only observation is followed by speech before it can be adopted", async () => {
  const prepared: InterviewDetail = {
    ...interview,
    phase: "questions",
    messages: [{ ...interview.messages[0]!, phase: "questions" }],
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
  const observation = {
    objective: "State and asynchronous UI",
    situation: "A screen loads data.",
    constraints: [],
    unresolvedPoints: [],
    sourceMessageIds: ["ready"],
    objectiveEvidence: [],
    hint: null,
    constraintChange: null,
  };
  const stream = (chunks: unknown[]) =>
    new Response(
      chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") +
        "data: [DONE]\n\n",
      { headers: { "content-type": "text/event-stream" } },
    );
  fetchSpy = spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      stream([
        {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: "observation-1",
                    type: "function",
                    function: {
                      name: "record_interview_observation",
                      arguments: JSON.stringify(observation),
                    },
                  },
                ],
              },
            },
          ],
        },
        { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
      ]),
    )
    .mockResolvedValueOnce(
      stream([
        {
          choices: [
            { delta: { content: "How would you handle stale responses?" } },
          ],
        },
        { choices: [{ delta: {}, finish_reason: "stop" }] },
      ]),
    );
  const parts = [];
  for await (const part of new LLMService(config).generateReply(
    prepared,
    new AbortController().signal,
  ))
    parts.push(part);
  expect(parts).toEqual([
    "How would you handle stale responses?",
    { type: "record_interview_observation", observation },
  ]);
  expect(fetchSpy).toHaveBeenCalledTimes(2);
  const [input, init] = fetchSpy.mock.calls[1]!;
  const body = (await new Request(input, init).json()) as {
    tools?: unknown;
    messages: { role: string; tool_call_id?: string }[];
  };
  expect(body.tools).toBeUndefined();
  expect(body.messages.slice(-2).map((item) => item.role)).toEqual([
    "assistant",
    "tool",
  ]);
  expect(body.messages.at(-1)?.tool_call_id).toBe("observation-1");
});

for (const withFarewell of [true, false]) {
  test(`streamed end tool ${withFarewell ? "stays separate from speech" : "does not request a new question"}`, async () => {
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
      ...(withFarewell
        ? [
            {
              choices: [{ delta: { content: "Thanks for the conversation." } }],
            },
          ]
        : []),
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
      ...(withFarewell ? ["Thanks for the conversation."] : []),
      {
        type: "end_interview",
        request: { reason: "candidate_requested_stop" },
      },
    ]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [input, init] = fetchSpy.mock.calls[0]!;
    const request = (await new Request(input, init).json()) as {
      tools: { function: { name: string } }[];
    };
    expect(request.tools.map((item) => item.function.name)).toEqual([
      "record_interview_observation",
      "end_interview",
    ]);
  });
}

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
