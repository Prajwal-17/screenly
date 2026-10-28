import { expect, test } from "bun:test";
import type { InterviewDetail } from "@repo/shared";
import {
  InterviewSession,
  type SessionDependencies,
} from "../src/lib/interviewSession";

function fixture(feedbackFails = false) {
  const detail: InterviewDetail = {
    id: "interview-one",
    status: "active",
    role: "Frontend",
    level: "Mid-level",
    topics: ["React"],
    duration: 20,
    phase: "questions",
    createdAt: 0,
    startedAt: null,
    endedAt: null,
    pausedAt: null,
    pausedMs: 0,
    feedbackStatus: "pending",
    feedback: null,
    feedbackModel: null,
    messages: [],
  };
  const calls: string[] = [];
  const store = {
    get: async () => structuredClone(detail),
    finish: async () => {
      calls.push("persist-completed");
      detail.status = "completed";
    },
  } as unknown as SessionDependencies["store"];
  const session = new InterviewSession(detail.id, () => {}, {
    store,
    background: () => {},
    scheduleDeadline: async () => {},
    cancelDeadline: async () => {
      calls.push("cancel-deadline");
    },
    closeVoice: async () => {
      calls.push("revoke-key");
    },
    speechEnabled: false,
    reply: async function* () {
      yield "unused";
    },
    openingReply: async () => ({ ready: true, text: "" }),
    feedback: async () => {
      calls.push("queue-feedback");
      if (feedbackFails) throw new Error("Feedback scheduling failed");
    },
    stt: () => {
      throw new Error("Unexpected transcription");
    },
    tts: () => {
      throw new Error("Unexpected speech");
    },
  });
  return { session, calls };
}

for (const feedback of [false, true]) {
  test(`finishing ${feedback ? "with" : "without"} feedback revokes once before scheduling work`, async () => {
    const { session, calls } = fixture();
    await Promise.all([session.finish(feedback), session.finish(feedback)]);
    expect(calls).toEqual([
      "persist-completed",
      "revoke-key",
      feedback ? "queue-feedback" : "cancel-deadline",
    ]);
    await session.close();
  });
}

test("feedback scheduling failure cannot leave the completed interview key usable", async () => {
  const { session, calls } = fixture(true);
  await expect(session.finish()).rejects.toThrow("Feedback scheduling failed");
  expect(calls).toEqual(["persist-completed", "revoke-key", "queue-feedback"]);
  await session.close();
});

test("disconnect closes the connection while preserving credentials for interview resume", async () => {
  const { session, calls } = fixture();
  await session.close();
  expect(calls).toEqual([]);
});
