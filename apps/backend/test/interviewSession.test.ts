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

for (const newSpeech of [false, true]) {
  test(`${newSpeech ? "real speech interrupts" : "an empty Flux Update preserves"} the readiness request after EndOfTurn`, async () => {
    const detail: InterviewDetail = {
      id: "readiness",
      status: "draft",
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
      messages: [],
    };
    const events: ServerEvent[] = [];
    const tasks = new Set<Promise<unknown>>();
    const requested = Promise.withResolvers<AbortSignal>();
    const decision = Promise.withResolvers<{ ready: true; text: "" }>();
    let turn!: (event: ListenV2TurnInfo) => void;
    const store = {
      get: async () => structuredClone(detail),
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
        phase: InterviewMessage["phase"],
      ) => {
        const message = {
          id: crypto.randomUUID(),
          role,
          content,
          status,
          phase,
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
        if (!(event instanceof Uint8Array)) events.push(event);
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
        openingReply: async (_detail, signal) => {
          requested.resolve(signal);
          return decision.promise;
        },
        reply: async function* () {
          yield "When would you lift React state into a parent?";
        },
      },
    );
    const event = (
      kind: ListenV2TurnInfo["event"],
      index: number,
      transcript: string,
    ) =>
      ({
        type: "TurnInfo",
        event: kind,
        turn_index: index,
        transcript,
      }) as ListenV2TurnInfo;
    try {
      await session.handle({ type: "start" });
      turn(event("EndOfTurn", 0, "I am ready."));
      const signal = await requested.promise;
      turn(event("Update", 1, newSpeech ? "Wait" : ""));
      expect(signal.aborted).toBe(newSpeech);
      decision.resolve({ ready: true, text: "" });
      while (tasks.size) await Promise.all([...tasks]);
      expect(detail.phase).toBe(newSpeech ? "opening" : "questions");
      if (!newSpeech) {
        expect(detail.messages.at(-1)?.content).toBe(
          "When would you lift React state into a parent?",
        );
        expect(events.some((e) => e.type === "error")).toBe(false);
      }
    } finally {
      decision.resolve({ ready: true, text: "" });
      await session.close();
    }
  });
}
