import { beforeAll, describe, expect, test } from "vitest";
import { db } from "./runtime";
import { user } from "../src/db/schema";
import { interviews } from "./runtime";
import {
  InterviewSession,
  type SessionDependencies,
} from "../src/lib/interviewSession";
import type { ListenV2TurnInfo } from "@deepgram/sdk/listen";
import type { ServerEvent } from "@repo/shared";
const pendingTasks = new Set<Promise<unknown>>();
function background(task: Promise<unknown>) {
  pendingTasks.add(task);
  void task.finally(() => pendingTasks.delete(task));
}
async function drain() {
  while (pendingTasks.size) await Promise.all([...pendingTasks]);
}
const userId = "test-candidate";
const settings = {
  role: "Frontend",
  level: "Mid-level",
  topics: ["React"],
  duration: 10,
} as const;
beforeAll(async () => {
  await db
    .insert(user)
    .values({ id: userId, name: "Candidate", email: "candidate@example.com" })
    .run();
});
async function fixture(
  reply: SessionDependencies["reply"],
  options: Partial<SessionDependencies> = {},
) {
  const interview = await interviews.create(userId, {
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
      background,
      scheduleDeadline: async () => {},
      cancelDeadline: async () => {},
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
    await drain();
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
  test("concurrent D1 writes retain a strictly ordered transcript", async () => {
    const interview = await interviews.create(userId, {
      ...settings,
      topics: [...settings.topics],
    });
    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        interviews.addMessage(
          interview.id,
          "user",
          `Answer ${index}`,
          `concurrent:${index}`,
        ),
      ),
    );
    const saved = await interviews.get(interview.id);
    const timestamps = saved!.messages.map((message) => message.createdAt);
    expect(timestamps).toHaveLength(8);
    expect(new Set(timestamps).size).toBe(8);
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
  });
  test("starts with a question and saves one response per unique answer", async () => {
    let calls = 0;
    const f = await fixture(async function* () {
      calls++;
      yield "How would you test this component?";
    });
    await f.session.handle({ type: "start" });
    await f.turn("I would test the user-visible behavior.");
    await f.turn("I would test the user-visible behavior.");
    const saved = (await interviews.get(f.interview.id))!;
    expect(saved.messages.map((m) => m.role)).toEqual([
      "assistant",
      "user",
      "assistant",
    ]);
    expect(calls).toBe(2);
    const start = saved.startedAt;
    await f.session.handle({ type: "start" });
    expect((await interviews.get(saved.id))?.startedAt).toBe(start);
    await f.session.close();
  });
  test("voice reconnect reopens transcription and preserves the timer and saved conversation", async () => {
    const f = await fixture(async function* () {
      yield "Explain a cache invalidation strategy.";
    });
    await f.session.handle({ type: "start" });
    await f.turn("I would invalidate on writes.");
    const began = (await interviews.get(f.interview.id))!.startedAt;
    await f.session.close();
    let connected = false;
    let receivedAudio = 0;
    let onTurn!: (event: ListenV2TurnInfo) => void;
    const reconnect = new InterviewSession(f.interview.id, () => {}, {
      store: interviews,
      background,
      scheduleDeadline: async () => {},
      cancelDeadline: async () => {},
      speechEnabled: false,
      reply: async function* () {
        yield "How would you test that strategy?";
      },
      feedback: async () => {},
      stt: (turn) => {
        onTurn = turn;
        return {
          connect: async () => {
            connected = true;
          },
          sendAudio: () => {
            receivedAudio++;
          },
          close: () => {
            connected = false;
          },
        };
      },
      tts: () => {
        throw new Error("Speech output is disabled in this fixture");
      },
    });
    reconnect.audio(new Uint8Array([1, 0]));
    expect(receivedAudio).toBe(0);
    await reconnect.handle({ type: "start" });
    expect(connected).toBe(true);
    expect((await interviews.get(f.interview.id))!.startedAt).toBe(began);
    expect((await interviews.get(f.interview.id))!.messages).toHaveLength(3);
    reconnect.audio(new Uint8Array([1, 0]));
    expect(receivedAudio).toBe(1);
    onTurn({
      event: "EndOfTurn",
      transcript: "I would exercise a stale cache.",
      turn_index: 0,
    } as ListenV2TurnInfo);
    await drain();
    expect((await interviews.get(f.interview.id))!.messages).toHaveLength(5);
    await reconnect.close();
    expect(connected).toBe(false);
    reconnect.audio(new Uint8Array([1, 0]));
    expect(receivedAudio).toBe(1);
  });
  test("interruption saves partial output and ignores late chunks", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const f = await fixture(async function* () {
      yield "Consider a cache.";
      await gate;
      yield "This late chunk must never appear.";
    });
    const pending = f.session.handle({ type: "start" });
    await expect
      .poll(() => f.events.some((event) => event.type === "delta"))
      .toBe(true);
    await f.session.interrupt();
    release();
    await pending;
    const messages = (await interviews.get(f.interview.id))!.messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]?.status).toBe("interrupted");
    expect(messages[0]?.content).toBe("Consider a cache.");
    expect(
      f.events
        .filter((e) => e.type === "delta")
        .map((e) => (e.type === "delta" ? e.text : "")),
    ).toEqual(["Consider a cache."]);
    await f.session.close();
  });
  test("speech remains interruptible until browser playback is acknowledged", async () => {
    const f = await fixture(
      async function* () {
        yield "Explain an HTTP cache.";
      },
      { speechEnabled: true },
    );
    await f.session.handle({ type: "start" });
    await f.session.interrupt();
    expect((await interviews.get(f.interview.id))!.messages[0]?.status).toBe(
      "interrupted",
    );
    await f.session.close();
    const acknowledged = await fixture(
      async function* () {
        yield "Explain an HTTP cache.";
      },
      { speechEnabled: true },
    );
    await acknowledged.session.handle({ type: "start" });
    await acknowledged.session.handle({ type: "played", responseId: 1 });
    await acknowledged.session.interrupt();
    expect(
      (await interviews.get(acknowledged.interview.id))!.messages[0]?.status,
    ).toBe("complete");
    await acknowledged.session.close();
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
    const f = await fixture(async function* () {
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
    const saved = (await interviews.get(f.interview.id))!.messages;
    expect(
      saved.map((message) => [message.role, message.status, message.content]),
    ).toEqual([
      ["assistant", "interrupted", "An opening question."],
      ["user", "complete", "Here is my answer."],
      ["assistant", "complete", "A follow-up question."],
    ]);
    await f.session.close();
  });
  test("voice interviews receive spoken replies and replay does not duplicate the transcript", async () => {
    const f = await fixture(
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
    expect((await interviews.get(f.interview.id))!.messages).toHaveLength(1);
    await f.session.close();
  });
  test("Deepgram frames pass through immediately and unchanged, with one flush per response", async () => {
    let release!: () => void;
    let generated!: () => void;
    let flushes = 0;
    let lateAudio!: (audio: Uint8Array) => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const began = new Promise<void>((resolve) => {
      generated = resolve;
    });
    const tokens = [
      "Welcome. Explain React rendering. ",
      "Then discuss its trade-offs.",
    ];
    const spoken: string[] = [];
    const frames = [
      new Uint8Array([1, 0, 255, 127, 0, 128]),
      new Uint8Array([7, 0, 8, 0]),
    ];
    const f = await fixture(
      async function* () {
        yield tokens[0]!;
        generated();
        await gate;
        yield tokens[1]!;
      },
      {
        speechEnabled: true,
        tts: (audio) => {
          lateAudio = audio;
          return {
            connect: async () => {},
            sendText: (text) => {
              spoken.push(text);
              audio(frames[spoken.length - 1]!);
            },
            flush: async () => {
              flushes++;
            },
            close: () => {},
          };
        },
      },
    );
    const pending = f.session.handle({ type: "start" });
    await began;
    expect(f.audioFrames).toHaveLength(1);
    expect(Array.from(f.audioFrames[0]!.slice(4))).toEqual(
      Array.from(frames[0]!),
    );
    expect(flushes).toBe(0); // Audio reaches the browser before generation or flushing finishes.
    release();
    await pending;
    expect(spoken).toEqual(tokens);
    expect(flushes).toBe(1);
    expect(f.audioFrames.map((frame) => Array.from(frame.slice(4)))).toEqual(
      frames.map((frame) => Array.from(frame)),
    );
    await f.session.interrupt();
    lateAudio(new Uint8Array([9, 0]));
    expect(f.audioFrames).toHaveLength(2);
    await f.session.close();
  });
  test("failed transcription leaves the draft unstarted and can be retried", async () => {
    let fail = true;
    const f = await fixture(
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
    expect((await interviews.get(f.interview.id))!.status).toBe("draft");
    expect((await interviews.get(f.interview.id))!.startedAt).toBeNull();
    fail = false;
    await f.session.handle({ type: "start" });
    expect(f.audioFrames.length).toBe(1);
    expect((await interviews.get(f.interview.id))!.messages).toHaveLength(1);
    await f.session.close();
  });
  test("ending without feedback saves the transcript and cancels its deadline without a report", async () => {
    let cancelled = 0;
    const f = await fixture(
      async function* () {
        yield "How would you test an API?";
      },
      {
        cancelDeadline: async () => {
          cancelled++;
        },
      },
    );
    await f.session.handle({ type: "start" });
    await f.turn("I would test the success and error responses.");
    await f.session.handle({ type: "finish", generateFeedback: false });
    await f.session.finish();
    const saved = (await interviews.get(f.interview.id))!;
    expect(saved.status).toBe("completed");
    expect(saved.feedbackStatus).toBe("skipped");
    expect(saved.feedback).toBeNull();
    expect(saved.messages).toHaveLength(3);
    expect(saved.endedAt).toBeGreaterThan(0);
    expect(cancelled).toBe(1);
    expect(f.reports()).toBe(0);
    expect(f.events).toContainEqual({
      type: "finished",
      id: f.interview.id,
      generateFeedback: false,
    });
    await f.turn("A late answer must not be saved.", 1);
    expect((await interviews.get(f.interview.id))!.messages).toHaveLength(3);
    await f.session.close();
  });
  test("finishing is idempotent and prevents later answers", async () => {
    const f = await fixture(async function* () {
      yield "What is a closure?";
    });
    await f.session.handle({ type: "start" });
    await Promise.all([
      f.session.finish(),
      f.session.finish(),
      f.session.finish(),
    ]);
    const ended = (await interviews.get(f.interview.id))?.endedAt;
    await f.session.finish();
    await f.turn("Too late.");
    expect((await interviews.get(f.interview.id))?.endedAt).toBe(ended);
    expect(f.reports()).toBe(1);
    expect((await interviews.get(f.interview.id))?.messages).toHaveLength(1);
    await f.session.close();
  });
  test("ownership and cascade deletion preserve isolation", async () => {
    const interview = await interviews.create(userId, {
      ...settings,
      topics: [...settings.topics],
    });
    await interviews.addMessage(interview.id, "user", "An answer.", "unique");
    expect(await interviews.owned(interview.id, "another-user")).toBeNull();
    await interviews.remove(interview.id, "another-user");
    expect(await interviews.get(interview.id)).not.toBeNull();
    await interviews.remove(interview.id, userId);
    expect(await interviews.get(interview.id)).toBeNull();
  });
});
