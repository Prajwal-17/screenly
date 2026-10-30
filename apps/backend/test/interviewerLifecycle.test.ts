import { expect, test } from "bun:test";
import type { ListenV2TurnInfo } from "@deepgram/sdk/listen";
import type {
  InterviewDetail,
  InterviewMessage,
  ServerEvent,
  SessionControlState,
  SessionEvent,
  InterviewObservation,
} from "@repo/shared";
import {
  InterviewSession,
  type ClosingIntent,
  type SessionDependencies,
} from "../src/lib/interviewSession";
import { liveMessages } from "../src/lib/interviewContext";

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
      promptVersion: "screenly-prompts-2.1",
      objectives: ["Data integrity and concurrency", "Failure recovery"],
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
  let openingReady = true;
  let observation: InterviewObservation | null =
    reason === "coverage_complete"
      ? {
          objective: "Failure recovery",
          situation: "An API write can be retried after an uncertain response.",
          constraints: ["Ownership and duplicate writes matter."],
          unresolvedPoints: ["How the retry key expires"],
          sourceMessageIds: ["m2", "m4"],
          objectiveEvidence: [
            { objective: "Data integrity and concurrency", messageIds: ["m2"] },
            { objective: "Failure recovery", messageIds: ["m4"] },
          ],
          hint: null,
          constraintChange: null,
        }
      : null;
  let replyText = "Thanks for walking through that.";
  const sentAudio: Uint8Array[] = [];
  let clearClosing: (() => Promise<void>) | null = null;
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
      setEventExposure: async (
        _id: string,
        eventId: string,
        exposure: "played",
      ) => {
        const event = detail.events?.find((item) => item.id === eventId);
        if (!event) return false;
        event.exposure = exposure;
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
        await clearClosing?.();
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
        sendAudio: async (audio) => {
          sentAudio.push(audio);
        },
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
    openingReply: async () =>
      openingReady
        ? { ready: true, text: "" }
        : { ready: false, text: "Take your time." },
    reply: async function* () {
      yield replyText;
      if (withEndTool) {
        beforeTool();
        if (observation)
          yield { type: "record_interview_observation" as const, observation };
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
    setCandidateContent(text: string) {
      detail.messages[3]!.content = text;
    },
    setObservation(value: InterviewObservation | null) {
      observation = value;
    },
    setReplyText(value: string) {
      replyText = value;
    },
    setPhase(phase: InterviewDetail["phase"]) {
      detail.phase = phase;
    },
    setOpeningReady(value: boolean) {
      openingReady = value;
    },
    setClearClosing(value: () => Promise<void>) {
      clearClosing = value;
    },
    sentAudio,
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

test("coverage needs current substantive objective sources, not long filler", async () => {
  const h = harness("coverage_complete", false);
  h.setCandidateContent(
    "I am not sure what to say yet. Could you repeat the instructions and give me a moment to think about what you want me to discuss?",
  );
  h.detail.messages[1]!.content = h.detail.messages[3]!.content;
  try {
    await h.session.handle({ type: "start" });
    await h.drain();
    expect(h.closing).toBeNull();
    expect(h.detail.control?.objectiveEvidence ?? []).toHaveLength(0);
    expect(h.detail.status).toBe("active");
  } finally {
    await h.session.close();
  }
});

test("stale or cancelled response cannot commit an observation", async () => {
  const stale = harness("coverage_complete", false);
  stale.setBeforeTool(() => {
    stale.detail.messages.push({
      id: "late",
      role: "user",
      content: "A later correction changes the source.",
      status: "complete",
      phase: "questions",
      createdAt: Date.now(),
    });
  });
  try {
    await stale.session.handle({ type: "start" });
    await stale.drain();
    expect(stale.detail.control?.objectiveEvidence ?? []).toHaveLength(0);
    expect(stale.detail.events ?? []).toHaveLength(0);
  } finally {
    await stale.session.close();
  }
  const cancelled = harness("coverage_complete", false);
  cancelled.setBeforeTool(() => {
    void cancelled.session.interrupt();
  });
  try {
    await cancelled.session.handle({ type: "start" });
    await cancelled.drain();
    expect(cancelled.detail.control?.objectiveEvidence ?? []).toHaveLength(0);
    expect(
      cancelled.detail.events?.some((event) => event.type === "hint") ?? false,
    ).toBe(false);
  } finally {
    await cancelled.session.close();
  }
});

for (const utterance of [
  "Can we stop the API retrying when the database fails?",
  "How would you end this interview in a test?",
  "I don't want to end this interview yet.",
  'The log says "Please end this interview now."',
]) {
  test(`candidate stop ignores scenario or reproduced speech: ${utterance}`, async () => {
    const h = harness("candidate_requested_stop", false);
    h.setCandidateContent(utterance);
    try {
      await h.session.handle({ type: "start" });
      await h.drain();
      expect(h.closing).toBeNull();
      expect(h.detail.status).toBe("active");
    } finally {
      await h.session.close();
    }
  });
}

test("committed observation retains changed constraint, correction and unresolved point after reconnect", async () => {
  const h = harness("coverage_complete", false);
  h.setReplyText(
    "Now the database is temporarily unavailable. What would you change?",
  );
  h.setObservation({
    objective: "Failure recovery",
    situation:
      "The candidate corrected the first approach to use an idempotency key.",
    constraints: ["The database is temporarily unavailable."],
    unresolvedPoints: ["How the retry key expires"],
    sourceMessageIds: ["m2", "m4"],
    objectiveEvidence: [
      { objective: "Data integrity and concurrency", messageIds: ["m2"] },
      { objective: "Failure recovery", messageIds: ["m4"] },
    ],
    hint: null,
    constraintChange: "Now the database is temporarily unavailable.",
  });
  try {
    await h.session.handle({ type: "start" });
    await h.drain();
    expect(h.detail.control?.constraints).toEqual([
      "The database is temporarily unavailable.",
    ]);
    expect(h.detail.control?.unresolvedPoints).toEqual([
      "How the retry key expires",
    ]);
    expect(h.detail.control?.objectiveEvidence).toHaveLength(2);
    expect(
      h.detail.events?.find((event) => event.type === "constraint-change")
        ?.exposure,
    ).toBe("unknown");
    expect(JSON.stringify(liveMessages(h.detail).messages)).toContain(
      "temporarily unavailable",
    );
  } finally {
    await h.session.close();
  }
});

test("explicit help is unknown until matching played; neutral probe records no hint", async () => {
  const h = harness("coverage_complete");
  h.setReplyText(
    "A hint: consider a stable idempotency key. How would you use it?",
  );
  h.setObservation({
    objective: "Failure recovery",
    situation: "An API write may be retried.",
    constraints: ["Ownership matters."],
    unresolvedPoints: [],
    sourceMessageIds: ["m2", "m4"],
    objectiveEvidence: [{ objective: "Failure recovery", messageIds: ["m4"] }],
    hint: "A hint: consider a stable idempotency key.",
    constraintChange: null,
  });
  try {
    await h.session.handle({ type: "start" });
    const hint = h.detail.events?.find((event) => event.type === "hint");
    expect(hint?.exposure).toBe("unknown");
    expect(hint?.messageIds).toEqual([h.detail.messages.at(-1)!.id]);
    await h.session.handle({ type: "played", responseId: 999 });
    expect(hint?.exposure).toBe("unknown");
    await h.session.handle({ type: "played", responseId: 1 });
    expect(hint?.exposure).toBe("played");
  } finally {
    await h.session.close();
  }
  const neutral = harness("coverage_complete");
  try {
    await neutral.session.handle({ type: "start" });
    expect(
      neutral.detail.events?.some((event) => event.type === "hint") ?? false,
    ).toBe(false);
    await neutral.session.handle({ type: "speech-start" });
  } finally {
    await neutral.session.close();
  }
  const unheard = harness("coverage_complete");
  unheard.setReplyText(
    "A hint: use a stable idempotency key. How would it help?",
  );
  unheard.setObservation({
    objective: "Failure recovery",
    situation: "An API write may be retried.",
    constraints: [],
    unresolvedPoints: [],
    sourceMessageIds: ["m4"],
    objectiveEvidence: [{ objective: "Failure recovery", messageIds: ["m4"] }],
    hint: "A hint: use a stable idempotency key.",
    constraintChange: null,
  });
  try {
    await unheard.session.handle({ type: "start" });
    await unheard.session.handle({ type: "speech-start" });
    expect(
      unheard.detail.events?.find((event) => event.type === "hint")?.exposure,
    ).toBe("unknown");
  } finally {
    await unheard.session.close();
  }
});

test("finish retains final STT arrival phase during opening and questions", async () => {
  for (const phase of ["opening", "questions"] as const) {
    const h = harness("coverage_complete", true, false);
    h.setPhase(phase);
    if (phase === "opening") h.setOpeningReady(false);
    try {
      await h.session.handle({ type: "start" });
      h.setFinalTranscript("I am not ready yet.");
      await h.session.handle({ type: "finish" });
      expect(h.detail.messages.at(-1)?.phase).toBe(phase);
    } finally {
      await h.session.close();
    }
  }
});

test("coverage barge-in buffers early audio until durable closing clear", async () => {
  const h = harness("coverage_complete");
  const gate = Promise.withResolvers<void>();
  h.setClearClosing(() => gate.promise);
  try {
    await h.session.handle({ type: "start" });
    h.session.audio(new Uint8Array([1, 2]));
    const cancel = h.session.handle({ type: "speech-start" });
    h.session.audio(new Uint8Array([3, 4]));
    expect(h.sentAudio).toHaveLength(0);
    gate.resolve();
    await cancel;
    await h.drain();
    expect(h.sentAudio.map((frame) => [...frame])).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(h.closing).toBeNull();
  } finally {
    gate.resolve();
    await h.session.close();
  }
});

test("explicit stop ignores VAD and immediate audio while farewell is pending", async () => {
  const h = harness("candidate_requested_stop");
  try {
    await h.session.handle({ type: "start" });
    h.session.audio(new Uint8Array([1, 2]));
    await h.session.handle({ type: "speech-start" });
    expect(h.sentAudio).toHaveLength(0);
    expect(h.closing?.reason).toBe("candidate_requested_stop");
    expect(
      h.events.some(
        (event) => event.type === "status" && event.status === "finishing",
      ),
    ).toBe(true);
  } finally {
    await h.session.close();
  }
});
