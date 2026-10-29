import { expect, test } from "bun:test";
import type { ListenV2TurnInfo } from "@deepgram/sdk/listen";
import type {
  InterviewDetail,
  InterviewMessage,
  ServerEvent,
  SessionControlState,
  SessionEvent,
} from "@repo/shared";
import {
  InterviewSession,
  type ClosingIntent,
  type SessionDependencies,
} from "../src/lib/interviewSession";

function harness(
  reason: "coverage_complete" | "candidate_requested_stop",
  speechEnabled = true,
  withEndTool = true,
) {
  const content =
    reason === "candidate_requested_stop"
      ? "Please end this interview now."
      : "I would validate the write at the API boundary, use one transaction for the invariant, and check retries against the same key.";
  const message = (
    id: string,
    role: InterviewMessage["role"],
    text: string,
  ): InterviewMessage => ({
    id,
    role,
    content: text,
    status: "complete",
    phase: "questions",
    createdAt: Number(id.slice(1)) || 1,
  });
  const detail: InterviewDetail = {
    id: "session",
    status: "active",
    role: "Backend",
    level: "Mid-level",
    topics: [],
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
    preparation: {
      schemaVersion: 2,
      role: "Backend",
      level: "Mid-level",
      rubricVersion: "screenly-rubric-2.0",
      promptVersion: "screenly-prompts-2.0",
      objectives: ["Data integrity and concurrency"],
      priorFindings: [],
      warnings: [],
      memoryDegraded: false,
    },
    messages: [
      message("m1", "assistant", "How would you handle the write?"),
      message(
        "m2",
        "user",
        "I would validate input and check account ownership before storing the request, then verify a useful error path.",
      ),
      message("m3", "assistant", "What happens if the request is retried?"),
      message("m4", "user", content),
    ],
  };
  const events: ServerEvent[] = [];
  const tasks = new Set<Promise<unknown>>();
  let closing: ClosingIntent | null = null;
  let beforeTool = () => {};
  let finalTranscript: string | null = null;
  let turnCallback: ((event: ListenV2TurnInfo) => void) | null = null;
  let finishCount = 0;
  let reviewCount = 0;
  const deps: SessionDependencies = {
    store: {
      get: async () => structuredClone(detail),
      liveContext: async () => structuredClone(detail),
      start: async () => structuredClone(detail),
      saveControl: async (_id: string, control: SessionControlState) => {
        detail.control = control;
        return true;
      },
      addEvent: async (_id: string, event: SessionEvent) => {
        detail.events = [...(detail.events ?? []), event];
        return true;
      },
      addMessage: async (
        _id: string,
        role: InterviewMessage["role"],
        text: string,
        _key: string,
        status: InterviewMessage["status"],
        phase: InterviewMessage["phase"],
      ) => {
        const saved = {
          id: `m${detail.messages.length + 1}`,
          role,
          content: text,
          status,
          phase,
          createdAt: Date.now(),
        };
        detail.messages.push(saved);
        return structuredClone(saved);
      },
      interruptMessage: async (id: string) => {
        const saved = detail.messages.find((item) => item.id === id);
        if (saved) saved.status = "interrupted";
        return saved ? structuredClone(saved) : undefined;
      },
      finish: async () => {
        if (detail.status === "active") {
          finishCount++;
          detail.status = "completed";
        }
        return structuredClone(detail);
      },
    } as unknown as SessionDependencies["store"],
    closing: {
      load: async () => closing,
      save: async (intent) => {
        closing = intent;
      },
      clear: async () => {
        closing = null;
      },
    },
    background: (task) => {
      tasks.add(task);
      void task.finally(() => tasks.delete(task));
    },
    scheduleDeadline: async () => {},
    cancelDeadline: async () => {},
    closeVoice: async () => {},
    speechEnabled,
    feedback: async () => {
      reviewCount++;
    },
    stt: (turn) => {
      turnCallback = turn;
      return {
        connect: async () => {},
        sendAudio: async () => {},
        endSpeech: () => {
          if (finalTranscript)
            turnCallback?.({
              type: "TurnInfo",
              event: "EndOfTurn",
              turn_index: 0,
              transcript: finalTranscript,
            } as ListenV2TurnInfo);
        },
        close: () => {},
      };
    },
    tts: () => ({
      connect: async () => {},
      sendText: () => {},
      flush: async () => {},
      close: () => {},
    }),
    openingReply: async () => ({ ready: true, text: "" }),
    reply: async function* () {
      yield "Thanks for walking through that.";
      if (withEndTool) {
        beforeTool();
        yield { type: "end_interview" as const, request: { reason } };
      }
    },
  };
  const session = new InterviewSession(
    detail.id,
    (event) => {
      if (!(event instanceof Uint8Array)) events.push(event);
    },
    deps,
  );
  return {
    session,
    detail,
    events,
    setClosing(intent: ClosingIntent) {
      closing = intent;
    },
    setBeforeTool(action: () => void) {
      beforeTool = action;
    },
    setFinalTranscript(text: string) {
      finalTranscript = text;
    },
    get closing() {
      return closing;
    },
    get finishCount() {
      return finishCount;
    },
    get reviewCount() {
      return reviewCount;
    },
    async drain() {
      while (tasks.size) await Promise.all([...tasks]);
    },
  };
}

test("coverage close requires matching playback and interruption cancels uncommitted intent", async () => {
  const h = harness("coverage_complete");
  try {
    await h.session.handle({ type: "start" });
    expect(h.closing?.reason).toBe("coverage_complete");
    await h.session.handle({ type: "played", responseId: 999 });
    expect(h.finishCount).toBe(0);
    await h.session.handle({ type: "speech-start" });
    expect(h.closing).toBeNull();
    expect(h.detail.status).toBe("active");
    expect(h.detail.messages.at(-1)?.status).toBe("interrupted");
    await h.session.handle({ type: "finish" });
    await h.session.handle({ type: "played", responseId: 1 });
    expect(h.finishCount).toBe(1);
    expect(h.reviewCount).toBe(1);
  } finally {
    await h.session.close();
  }
});

test("manual finish commits a final STT turn without starting another reply", async () => {
  const h = harness("coverage_complete", true, false);
  try {
    await h.session.handle({ type: "start" });
    h.setFinalTranscript(
      "One final detail: I would test the retry against the same idempotency key.",
    );
    await h.session.handle({ type: "finish" });
    expect(h.detail.status).toBe("completed");
    expect(h.detail.messages.at(-1)?.role).toBe("user");
    expect(h.detail.messages.at(-1)?.content).toContain("One final detail");
    expect(
      h.detail.messages.filter((message) => message.role === "assistant"),
    ).toHaveLength(3);
    expect(h.reviewCount).toBe(1);
  } finally {
    await h.session.close();
  }
});

test("matching playback acknowledgement completes a coverage close once", async () => {
  const h = harness("coverage_complete");
  try {
    await h.session.handle({ type: "start" });
    const responseId = h.closing?.responseId;
    expect(typeof responseId).toBe("number");
    await h.session.handle({ type: "played", responseId: responseId! });
    await h.session.handle({ type: "played", responseId: responseId! });
    expect(h.finishCount).toBe(1);
    expect(h.reviewCount).toBe(1);
  } finally {
    await h.session.close();
  }
});

test("a tool proposal bound to an older transcript cannot finish", async () => {
  const h = harness("candidate_requested_stop", false);
  h.setBeforeTool(() => {
    h.detail.messages.push({
      id: "late-candidate",
      role: "user",
      content: "I want to add something.",
      status: "complete",
      phase: "questions",
      createdAt: Date.now(),
    });
  });
  try {
    await h.session.handle({ type: "start" });
    await h.drain();
    expect(h.closing).toBeNull();
    expect(h.detail.status).toBe("active");
    expect(h.reviewCount).toBe(0);
  } finally {
    await h.session.close();
  }
});

test("explicit candidate stop completes once without requiring another spoken turn", async () => {
  const h = harness("candidate_requested_stop", false);
  try {
    await h.session.handle({ type: "start" });
    await h.drain();
    expect(h.detail.status).toBe("completed");
    expect(h.finishCount).toBe(1);
    expect(h.reviewCount).toBe(1);
    expect(h.detail.messages.at(-1)?.content).toBe(
      "Thanks for walking through that.",
    );
  } finally {
    await h.session.close();
  }
});

test("expired durable closing intent resumes and freezes one transcript", async () => {
  const h = harness("coverage_complete", false);
  const frozen = h.detail.messages.map((message) => message.id);
  h.setClosing({
    interviewId: "session",
    responseId: 17,
    reason: "coverage_complete",
    deadlineAt: Date.now() - 1,
    messageId: "m3",
  });
  try {
    await h.session.ready();
    await new Promise((resolve) => setTimeout(resolve, 10));
    await h.drain();
    expect(h.detail.status).toBe("completed");
    expect(h.detail.messages.map((message) => message.id)).toEqual(frozen);
    expect(h.finishCount).toBe(1);
    expect(h.reviewCount).toBe(1);
  } finally {
    await h.session.close();
  }
});
