import { afterEach, expect, spyOn, test } from "bun:test";
import type { InterviewDetail } from "@repo/shared";
import { readConfig } from "../src/config";
import { InvalidOpeningReplyError, LLMService } from "../src/lib/llmService";

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
