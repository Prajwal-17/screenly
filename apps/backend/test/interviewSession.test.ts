import { expect, test } from "bun:test";
import type { ListenV2TurnInfo } from "@deepgram/sdk/listen";
import type {
  InterviewDetail,
  InterviewMessage,
  ServerEvent,
} from "@repo/shared";
import {
  InterviewSession,
  type SessionDependencies,
} from "../src/lib/interviewSession";

function harness(
  options: {
    phase?: InterviewDetail["phase"];
    openingReply?: SessionDependencies["openingReply"];
    reply?: SessionDependencies["reply"];
    onEvent?: (event: ServerEvent) => void;
  } = {},
) {
  const phase = options.phase ?? "opening";
  const detail: InterviewDetail = {
    id: "readiness",
    status: phase === "opening" ? "draft" : "active",
    role: "Backend",
    level: "Mid-level",
    topics: [],
    duration: 20,
    phase,
    createdAt: 0,
    startedAt: null,
    endedAt: null,
    pausedAt: null,
    pausedMs: 0,
    feedbackStatus: "pending",
    feedback: null,
    feedbackModel: null,
    messages:
      phase === "opening"
        ? []
        : [
            {
              id: "question",
              role: "assistant",
              content: "How would you handle a retry?",
              phase,
              status: "complete",
              createdAt: 1,
            },
          ],
  };
  const events: ServerEvent[] = [];
  const tasks = new Set<Promise<unknown>>();
  let turn!: (event: ListenV2TurnInfo) => void;
  const store = {
    get: async () => structuredClone(detail),
    liveContext: async () => structuredClone(detail),
    start: async () => {
      detail.status = "active";
      return structuredClone(detail);
    },
    beginQuestions: async () => {
      detail.phase = "questions";
      return structuredClone(detail);
    },
    addMessage: async (
      _id: string,
      role: InterviewMessage["role"],
      content: string,
      _key: string,
      status: InterviewMessage["status"],
      messagePhase: InterviewMessage["phase"],
    ) => {
      const message = {
        id: crypto.randomUUID(),
        role,
        content,
        status,
        phase: messagePhase,
        createdAt: Date.now(),
      };
      detail.messages.push(message);
      return structuredClone(message);
    },
    interruptMessage: async (id: string) => {
      const message = detail.messages.find((m) => m.id === id);
      if (message) message.status = "interrupted";
      return message;
    },
  } as unknown as SessionDependencies["store"];
  const session = new InterviewSession(
    detail.id,
    (event) => {
      if (!(event instanceof Uint8Array)) {
        events.push(event);
        options.onEvent?.(event);
      }
    },
    {
      store,
      speechEnabled: false,
      background: (task) => {
        tasks.add(task);
        void task.finally(() => tasks.delete(task));
      },
      scheduleDeadline: async () => {},
      cancelDeadline: async () => {},
      closeVoice: async () => {},
      feedback: async () => {},
      stt: (callback) => {
        turn = callback;
        return {
          connect: async () => {},
          sendAudio: async () => {},
          endSpeech: () => {},
          close: () => {},
        };
      },
      tts: () => {
        throw new Error("Speech is disabled in this state-machine test");
      },
      openingReply:
        options.openingReply ?? (async () => ({ ready: true, text: "" })),
      reply:
        options.reply ??
        async function* () {
          yield "How would you make a retried API request safe?";
        },
    },
  );
  return {
    session,
    detail,
    events,
    turn: (event: ListenV2TurnInfo) => turn(event),
    async drain() {
      while (tasks.size) await Promise.all([...tasks]);
    },
  };
}

function event(
  kind: ListenV2TurnInfo["event"],
  index: number,
  transcript: string,
) {
  return {
    type: "TurnInfo",
    event: kind,
    turn_index: index,
    transcript,
  } as ListenV2TurnInfo;
}

for (const newSpeech of [false, true]) {
  test(`${newSpeech ? "real speech interrupts" : "an empty Flux Update preserves"} the readiness request after EndOfTurn`, async () => {
    const requested = Promise.withResolvers<AbortSignal>();
    const decision = Promise.withResolvers<{ ready: true; text: "" }>();
    const h = harness({
      openingReply: async (_detail, signal) => {
        requested.resolve(signal);
        return decision.promise;
      },
    });
    try {
      await h.session.handle({ type: "start" });
      h.turn(event("EndOfTurn", 0, "I am ready."));
      const signal = await requested.promise;
      h.turn(event("Update", 1, newSpeech ? "Wait" : ""));
      expect(signal.aborted).toBe(newSpeech);
      decision.resolve({ ready: true, text: "" });
      await h.drain();
      expect(h.detail.phase).toBe(newSpeech ? "opening" : "questions");
      if (!newSpeech) {
        expect(h.detail.messages.at(-1)?.content).toBe(
          "How would you make a retried API request safe?",
        );
        expect(h.events.some((e) => e.type === "error")).toBe(false);
      }
    } finally {
      decision.resolve({ ready: true, text: "" });
      await h.session.close();
    }
  });
}

test("an eager opening transcript does not cancel the final readiness check", async () => {
  let readinessSignal: AbortSignal | undefined;
  const h = harness({
    openingReply: async (_detail, signal) => {
      readinessSignal = signal;
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      return { ready: true, text: "" };
    },
  });
  try {
    await h.session.handle({ type: "start" });
    h.turn(event("EagerEndOfTurn", 0, "Yes. I am ready."));
    await h.drain();
    h.turn(event("EndOfTurn", 0, "Yes. I am ready."));
    await h.drain();
    expect(readinessSignal?.aborted).toBe(false);
    expect(h.detail.phase).toBe("questions");
    expect(h.detail.messages.at(-1)?.content).toBe(
      "How would you make a retried API request safe?",
    );
    expect(h.events.some((e) => e.type === "error")).toBe(false);
  } finally {
    await h.session.close();
  }
});

test("candidate speech still interrupts an adopted speculative reply", async () => {
  const draftStarted = Promise.withResolvers<AbortSignal>();
  const draftOutput = Promise.withResolvers<void>();
  const h = harness({
    phase: "questions",
    onEvent: (item) => {
      if (item.type === "delta") draftOutput.resolve();
    },
    reply: async function* (_interview, signal) {
      draftStarted.resolve(signal);
      yield "What happens";
      if (!signal.aborted)
        await new Promise<void>((resolve) =>
          signal.addEventListener("abort", () => resolve(), { once: true }),
        );
    },
  });
  try {
    await h.session.handle({ type: "start" });
    h.turn(event("EagerEndOfTurn", 0, "I would use an idempotency key."));
    const signal = await draftStarted.promise;
    await h.drain();
    h.turn(event("EndOfTurn", 0, "I would use an idempotency key."));
    await draftOutput.promise;
    await h.session.handle({ type: "speech-start" });
    expect(signal.aborted).toBe(true);
    await h.drain();
    expect(h.detail.messages.at(-1)?.status).toBe("interrupted");
  } finally {
    await h.session.close();
  }
});

test("an adopted speculative response is streamed and saved only once", async () => {
  const h = harness({
    phase: "questions",
    reply: async function* () {
      yield "How would you handle a retried request?";
    },
  });
  try {
    await h.session.handle({ type: "start" });
    h.turn(event("EagerEndOfTurn", 0, "Please move on."));
    await h.drain();
    h.turn(event("EndOfTurn", 0, "Please move on."));
    await h.drain();
    expect(h.detail.messages.at(-1)?.content).toBe(
      "How would you handle a retried request?",
    );
    expect(h.events.filter((item) => item.type === "delta")).toHaveLength(1);
  } finally {
    await h.session.close();
  }
});

const longQuestion =
  "A payment request times out after reaching a provider. How would you make a retry safe while the result is unknown?";
for (const [suffix, expected] of [
  [longQuestion, longQuestion],
  [
    longQuestion.slice(0, 18) + "a different continuation.",
    longQuestion + longQuestion.slice(0, 18) + "a different continuation.",
  ],
  [longQuestion.slice(0, 18), longQuestion + longQuestion.slice(0, 18)],
] as const) {
  test(`response replay filter preserves ${suffix === longQuestion ? "a single full question" : "a non-matching continuation"}`, async () => {
    const h = harness({
      phase: "questions",
      reply: async function* () {
        // The second copy may start inside the same provider chunk.
        yield longQuestion.slice(0, -1);
        yield longQuestion.slice(-1) + suffix.slice(0, 12);
        yield suffix.slice(12);
      },
    });
    try {
      await h.session.handle({ type: "start" });
      h.turn(event("EndOfTurn", 0, "Please move on."));
      await h.drain();
      expect(h.detail.messages.at(-1)?.content).toBe(expected.trim());
      expect(
        h.events
          .filter((item) => item.type === "delta")
          .map((item) => (item.type === "delta" ? item.text : ""))
          .join(""),
      ).toBe(expected);
    } finally {
      await h.session.close();
    }
  });
}
