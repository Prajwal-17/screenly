import { beforeAll, describe, expect, test } from "bun:test";
import { db } from "../src/db";
import { user } from "../src/db/schema";
import { interviews } from "../src/db/interviews";
import {
  InterviewSession,
  type SessionDependencies,
} from "../src/lib/interviewSession";
import type { ListenV2TurnInfo } from "@deepgram/sdk/listen";
import type { ServerEvent } from "@repo/shared";
const userId = "test-candidate";
const settings = {
  role: "Frontend",
  level: "Mid-level",
  topics: ["React"],
  duration: 10,
} as const;
beforeAll(() => {
  db.insert(user)
    .values({ id: userId, name: "Candidate", email: "candidate@example.com" })
    .run();
});
function fixture(
  reply: SessionDependencies["reply"],
  options: Partial<SessionDependencies> = {},
) {
  const interview = interviews.create(userId, {
    ...settings,
    topics: [...settings.topics],
  });
  const events: ServerEvent[] = [];
  const audioFrames: Uint8Array[] = [];
  let reports = 0;
  let onTurn!: (event: ListenV2TurnInfo) => void;
  const session = new InterviewSession(
    interview.id,
    (event) => {
      if (event instanceof Uint8Array) audioFrames.push(event);
      else events.push(event);
    },
    {
      store: interviews,
      speechEnabled: false,
      reply,
      feedback: async () => {
        reports++;
      },
      stt: (turn) => {
        onTurn = turn;
        return {
          connect: async () => {},
          sendAudio: () => {},
          close: () => {},
        };
      },
      tts: () => ({
        connect: async () => {},
        sendText: () => {},
        flush: async () => {},
        close: () => {},
      }),
      ...options,
    },
  );
  async function turn(text: string, index = 0) {
    onTurn({
      event: "EndOfTurn",
      transcript: text,
      turn_index: index,
    } as ListenV2TurnInfo);
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  return {
    session,
    interview,
    events,
    audioFrames,
    turn,
    reports: () => reports,
  };
}
describe("interview persistence and orchestration", () => {
  test("starts with a question and saves one response per unique answer", async () => {
    let calls = 0;
    const f = fixture(async function* () {
      calls++;
      yield "How would you test this component?";
    });
    await f.session.handle({ type: "start" });
    await f.turn("I would test the user-visible behavior.");
    await f.turn("I would test the user-visible behavior.");
    const saved = interviews.get(f.interview.id)!;
    expect(saved.messages.map((m) => m.role)).toEqual([
      "assistant",
      "user",
      "assistant",
    ]);
    expect(calls).toBe(2);
    const start = saved.startedAt;
    await f.session.handle({ type: "start" });
    expect(interviews.get(saved.id)?.startedAt).toBe(start);
    f.session.close();
  });
  test("typed fallback skips voice, acknowledges and deduplicates answers across connections", async () => {
    let calls = 0;
    const f = fixture(
      async function* () {
        calls++;
        yield "Explain a cache invalidation strategy.";
      },
      {
        stt: () => {
          throw new Error("Typed mode must not open a microphone connection");
        },
      },
    );
    const answer = {
      type: "answer" as const,
      id: crypto.randomUUID(),
      text: "I would invalidate on writes.",
    };
    await f.session.handle(answer);
    expect(interviews.get(f.interview.id)!.messages).toHaveLength(0);
    await f.session.handle({ type: "start", typed: true });
    const began = interviews.get(f.interview.id)!.startedAt;
    await f.session.handle(answer);
    await f.session.handle(answer);
    expect(calls).toBe(2);
    expect(
      f.events.filter((event) => event.type === "answer-saved"),
    ).toHaveLength(2);
    expect(interviews.get(f.interview.id)!.messages).toHaveLength(3);
    f.session.close();
    // A lost acknowledgement can be retried on a new connection without another turn.
    const reconnect = new InterviewSession(
      f.interview.id,
      (event) => {
        if (!(event instanceof Uint8Array)) f.events.push(event);
      },
      {
        store: interviews,
        speechEnabled: false,
        reply: () => {
          throw new Error("Duplicate answer must not generate a reply");
        },
        feedback: async () => {},
        stt: () => {
          throw new Error("No STT");
        },
        tts: () => {
          throw new Error("No TTS");
        },
      },
    );
    await reconnect.handle({ type: "start", typed: true });
    await reconnect.handle(answer);
    expect(interviews.get(f.interview.id)!.startedAt).toBe(began);
    expect(interviews.get(f.interview.id)!.messages).toHaveLength(3);
    expect(
      f.events.filter((event) => event.type === "answer-saved"),
    ).toHaveLength(3);
    await reconnect.finish();
    await reconnect.handle({
      ...answer,
      id: crypto.randomUUID(),
      text: "Too late",
    });
    expect(interviews.get(f.interview.id)!.messages).toHaveLength(3);
    reconnect.close();
  });
  test("interruption saves partial output and ignores late chunks", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const f = fixture(async function* () {
      yield "Consider a cache.";
      await gate;
      yield "This late chunk must never appear.";
    });
    const pending = f.session.handle({ type: "start" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    f.session.interrupt();
    release();
    await pending;
    const messages = interviews.get(f.interview.id)!.messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]?.status).toBe("interrupted");
    expect(messages[0]?.content).toBe("Consider a cache.");
    expect(
      f.events
        .filter((e) => e.type === "delta")
        .map((e) => (e.type === "delta" ? e.text : "")),
    ).toEqual(["Consider a cache."]);
    f.session.close();
  });
  test("speech remains interruptible until browser playback is acknowledged", async () => {
    const f = fixture(
      async function* () {
        yield "Explain an HTTP cache.";
      },
      { speechEnabled: true },
    );
    await f.session.handle({ type: "start" });
    f.session.interrupt();
    expect(interviews.get(f.interview.id)!.messages[0]?.status).toBe(
      "interrupted",
    );
    f.session.close();
    const acknowledged = fixture(
      async function* () {
        yield "Explain an HTTP cache.";
      },
      { speechEnabled: true },
    );
    await acknowledged.session.handle({ type: "start" });
    await acknowledged.session.handle({ type: "played", responseId: 1 });
    acknowledged.session.interrupt();
    expect(interviews.get(acknowledged.interview.id)!.messages[0]?.status).toBe(
      "complete",
    );
    acknowledged.session.close();
  });
  test("a new answer follows interrupted output in the persisted transcript", async () => {
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const began = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let calls = 0;
    const f = fixture(async function* () {
      calls++;
      if (calls === 1) {
        yield "An opening question.";
        entered();
        await gate;
        yield "Stale output.";
      } else yield "A follow-up question.";
    });
    const opening = f.session.handle({ type: "start" });
    await began;
    await f.turn("Here is my answer.");
    release();
    await opening;
    const saved = interviews.get(f.interview.id)!.messages;
    expect(
      saved.map((message) => [message.role, message.status, message.content]),
    ).toEqual([
      ["assistant", "interrupted", "An opening question."],
      ["user", "complete", "Here is my answer."],
      ["assistant", "complete", "A follow-up question."],
    ]);
    f.session.close();
  });
  test("voice interviews receive spoken replies and replay does not duplicate the transcript", async () => {
    const f = fixture(
      async function* () {
        yield "Tell me about React.";
      },
      {
        speechEnabled: true,
        tts: (audio) => ({
          connect: async () => {},
          sendText: () => audio(new Uint8Array([1, 0, 2, 0])),
          flush: async () => {},
          close: () => {},
        }),
      },
    );
    await f.session.handle({ type: "start" });
    expect(f.audioFrames.length).toBe(1);
    await f.session.handle({ type: "played", responseId: 1 });
    await f.session.handle({ type: "speak" });
    expect(f.audioFrames.length).toBe(2);
    await f.session.handle({ type: "start" });
    expect(f.audioFrames.length).toBe(3);
    expect(interviews.get(f.interview.id)!.messages).toHaveLength(1);
    f.session.close();
  });
  test("failed transcription leaves the draft unstarted and can be retried", async () => {
    let fail = true;
    const f = fixture(
      async function* () {
        yield "Describe an HTTP cache.";
      },
      {
        speechEnabled: true,
        stt: () => ({
          connect: async () => {
            if (fail) throw new Error("Transcription failed");
          },
          sendAudio: () => {},
          close: () => {},
        }),
        tts: (audio) => ({
          connect: async () => {},
          sendText: () => audio(new Uint8Array([1, 0, 2, 0])),
          flush: async () => {},
          close: () => {},
        }),
      },
    );
    await f.session.handle({ type: "start" });
    expect(
      f.events.some(
        (event) => event.type === "error" && event.scope === "voice",
      ),
    ).toBe(true);
    expect(f.audioFrames).toHaveLength(0);
    expect(interviews.get(f.interview.id)!.status).toBe("draft");
    expect(interviews.get(f.interview.id)!.startedAt).toBeNull();
    fail = false;
    await f.session.handle({ type: "start" });
    expect(f.audioFrames.length).toBe(1);
    expect(interviews.get(f.interview.id)!.messages).toHaveLength(1);
    f.session.close();
  });
  test("finishing is idempotent and prevents later answers", async () => {
    const f = fixture(async function* () {
      yield "What is a closure?";
    });
    await f.session.handle({ type: "start" });
    await f.session.finish();
    const ended = interviews.get(f.interview.id)?.endedAt;
    await f.session.finish();
    await f.turn("Too late.");
    expect(interviews.get(f.interview.id)?.endedAt).toBe(ended);
    expect(f.reports()).toBe(1);
    expect(interviews.get(f.interview.id)?.messages).toHaveLength(1);
    f.session.close();
  });
  test("ownership and cascade deletion preserve isolation", () => {
    const interview = interviews.create(userId, {
      ...settings,
      topics: [...settings.topics],
    });
    interviews.addMessage(interview.id, "user", "An answer.", "unique");
    expect(interviews.owned(interview.id, "another-user")).toBeNull();
    interviews.remove(interview.id, "another-user");
    expect(interviews.get(interview.id)).not.toBeNull();
    interviews.remove(interview.id, userId);
    expect(interviews.get(interview.id)).toBeNull();
  });
});
