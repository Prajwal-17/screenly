import { beforeAll, describe, expect, test, vi } from "vitest";
import { db } from "./runtime";
import { user, interviewSession } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { interviews } from "./runtime";
import {
  InterviewSession,
  type SessionDependencies,
} from "../src/lib/interviewSession";
import type { ListenV2TurnInfo } from "@deepgram/sdk/listen";
import {
  emptyProfile,
  interviewElapsedMs,
  type ServerEvent,
  type InterviewPhase,
} from "@repo/shared";
import { profiles } from "./runtime";
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
  phase: InterviewPhase = "questions",
) {
  const interview = await interviews.create(userId, {
    ...settings,
    topics: [...settings.topics],
  });
  // Existing orchestration cases also cover sessions created before the opening feature.
  await db
    .update(interviewSession)
    .set({ phase })
    .where(eq(interviewSession.id, interview.id));
  const events: ServerEvent[] = [];
  const audioFrames: Uint8Array[] = [];
  let reports = 0;
  let onTurn!: (event: ListenV2TurnInfo) => void;
  const dependencies: SessionDependencies = {
    store: interviews,
    background,
    scheduleDeadline: async () => {},
    cancelDeadline: async () => {},
    speechEnabled: false,
    reply,
    openingReply: async () => ({ ready: true, text: "" }),
    feedback: async () => {
      reports++;
    },
    stt: (turn) => {
      onTurn = turn;
      return {
        connect: async () => {},
        endSpeech: () => {},
        sendAudio: async () => {},
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
  };
  const reconnect = () =>
    new InterviewSession(
      interview.id,
      (event) => {
        if (event instanceof Uint8Array) audioFrames.push(event);
        else events.push(event);
      },
      dependencies,
    );
  const session = reconnect();
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
    reconnect,
    interview,
    events,
    audioFrames,
    turn,
    emitTurn: (
      event: Pick<ListenV2TurnInfo, "event" | "transcript" | "turn_index">,
    ) => onTurn(event as ListenV2TurnInfo),
    reports: () => reports,
  };
}
describe("interview persistence and orchestration", () => {
  test("identical words repeated after a pause are retained as a new segment in an eager reply", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const answers: string[][] = [];
    const f = await fixture(async function* (interview) {
      const call = answers.push(
        interview.messages
          .filter((m) => m.role === "user")
          .map((m) => m.content),
      );
      if (call === 2) await gate;
      yield call === 1 ? "An opening question." : "A follow-up.";
    });
    try {
      await f.session.handle({ type: "start" });
      f.emitTurn({
        event: "EndOfTurn",
        transcript: "I would add a cache.",
        turn_index: 0,
      });
      await expect.poll(() => answers.length).toBe(2);
      await f.session.handle({ type: "speech-start" });
      f.emitTurn({
        event: "EagerEndOfTurn",
        transcript: "I would add a cache.",
        turn_index: 1,
      });
      await expect.poll(() => answers.length).toBe(3);
      expect(answers[2]).toEqual([
        "I would add a cache.",
        "I would add a cache.",
      ]);
      f.emitTurn({
        event: "EndOfTurn",
        transcript: "I would add a cache.",
        turn_index: 1,
      });
      release();
      await drain();
      expect(answers).toHaveLength(3);
      expect(
        (await interviews.get(f.interview.id))!.messages.filter(
          (m) => m.role === "user",
        ),
      ).toHaveLength(2);
    } finally {
      release();
      await f.session.close();
      await drain();
    }
  });
  test("resuming across several finalized segments cancels old requests and retains every thought", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const requests: { signal: AbortSignal; answers: string[] }[] = [];
    const f = await fixture(async function* (interview, signal) {
      const call = requests.push({
        signal,
        answers: interview.messages
          .filter((m) => m.role === "user")
          .map((m) => m.content),
      });
      if (call === 2 || call === 3) await gate;
      yield call === 1
        ? "An opening question."
        : call === 4
          ? "A follow-up using all your thoughts."
          : "Stale reply that must not appear.";
    });
    try {
      await f.session.handle({ type: "start" });
      f.emitTurn({
        event: "EndOfTurn",
        transcript: "I would cache the response.",
        turn_index: 0,
      });
      await expect.poll(() => requests.length).toBe(2);
      await f.session.handle({ type: "speech-start" });
      expect(requests[1]!.signal.aborted).toBe(true);
      f.emitTurn({
        event: "EndOfTurn",
        transcript: "Actually, invalidation is the tricky part.",
        turn_index: 1,
      });
      await expect.poll(() => requests.length).toBe(3);
      await f.session.handle({ type: "speech-start" });
      expect(requests[2]!.signal.aborted).toBe(true);
      f.emitTurn({
        event: "EndOfTurn",
        transcript: "I would invalidate on writes and keep a short TTL.",
        turn_index: 2,
      });
      await expect.poll(() => requests.length).toBe(4);
      release();
      await drain();
      expect(requests[3]!.answers).toEqual([
        "I would cache the response.",
        "Actually, invalidation is the tricky part.",
        "I would invalidate on writes and keep a short TTL.",
      ]);
      const messages = (await interviews.get(f.interview.id))!.messages;
      expect(
        messages.filter((m) => m.role === "assistant").map((m) => m.content),
      ).toEqual([
        "An opening question.",
        "A follow-up using all your thoughts.",
      ]);
      expect(
        f.events.some(
          (event) =>
            event.type === "delta" && event.text.includes("Stale reply"),
        ),
      ).toBe(false);
    } finally {
      release();
      await f.session.close();
      await drain();
    }
  });
  test("local resumed speech prevents a queued final write from starting an obsolete reply", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let writing = false;
    const inputs: string[][] = [];
    const f = await fixture(
      async function* (interview) {
        inputs.push(
          interview.messages
            .filter((m) => m.role === "user")
            .map((m) => m.content),
        );
        yield "A relevant question.";
      },
      {
        store: {
          ...interviews,
          addMessage: async (...args) => {
            if (args[1] === "user" && args[2] === "First thought.") {
              writing = true;
              await gate;
            }
            return interviews.addMessage(...args);
          },
        },
      },
    );
    try {
      await f.session.handle({ type: "start" });
      f.emitTurn({
        event: "EndOfTurn",
        transcript: "First thought.",
        turn_index: 0,
      });
      await expect.poll(() => writing).toBe(true);
      await f.session.handle({ type: "speech-start" }); // No new STT turn has arrived yet.
      release();
      await drain();
      expect(inputs).toHaveLength(1);
      await f.turn("And an important correction.", 1);
      expect(inputs[1]).toEqual([
        "First thought.",
        "And an important correction.",
      ]);
    } finally {
      release();
      await f.session.close();
      await drain();
    }
  });
  test("a new partial or resumed turn also aborts active generation without a local speech signal", async () => {
    for (const event of ["Update", "TurnResumed"] as const) {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let pending: AbortSignal | undefined;
      let calls = 0;
      const f = await fixture(async function* (_interview, signal) {
        const call = ++calls;
        if (call === 2) {
          pending = signal;
          await gate;
        }
        yield call === 2 ? "Old response." : "A question.";
      });
      try {
        await f.session.handle({ type: "start" });
        f.emitTurn({
          event: "EndOfTurn",
          transcript: "One part.",
          turn_index: 0,
        });
        await expect.poll(() => pending != null).toBe(true);
        f.emitTurn({ event, transcript: "Also", turn_index: 1 });
        expect(pending!.aborted).toBe(true);
        release();
        await f.turn("Also consider this.", 1);
        expect(
          (await interviews.get(f.interview.id))!.messages.some(
            (m) => m.content === "Old response.",
          ),
        ).toBe(false);
      } finally {
        release();
        await f.session.close();
        await drain();
      }
    }
  });
  test("eager speech starts one hidden LLM draft and reuses it only after finalization", async () => {
    const inputs: string[] = [];
    let speechConnections = 0;
    const f = await fixture(
      async function* (interview) {
        inputs.push(interview.messages.at(-1)?.content ?? "");
        yield inputs.length === 1
          ? "An opening question."
          : "A prepared follow-up.";
      },
      {
        speechEnabled: true,
        tts: (audio) => ({
          connect: async () => {
            speechConnections++;
          },
          sendText: () => audio(new Uint8Array([1, 0])),
          flush: async () => {},
          close: () => {},
        }),
      },
    );
    await f.session.handle({ type: "start" });
    f.emitTurn({ event: "StartOfTurn", transcript: "", turn_index: 0 });
    await drain();
    const before = f.events.length;
    f.emitTurn({
      event: "EagerEndOfTurn",
      transcript: "I would add an index.",
      turn_index: 0,
    });
    await drain();
    expect(inputs).toHaveLength(2); // The request starts before final transcription.
    expect(inputs[1]).toBe("I would add an index.");
    expect(speechConnections).toBe(1);
    expect(f.events.slice(before).some((event) => event.type === "delta")).toBe(
      false,
    );
    expect((await interviews.get(f.interview.id))!.messages).toHaveLength(1);
    // Repeated eager events must not make duplicate model requests.
    f.emitTurn({
      event: "EagerEndOfTurn",
      transcript: "I would add an index.",
      turn_index: 0,
    });
    await drain();
    await f.turn("I would add an index.");
    expect(inputs).toHaveLength(2);
    expect(speechConnections).toBe(2);
    expect(
      (await interviews.get(f.interview.id))!.messages.map((m) => m.content),
    ).toEqual([
      "An opening question.",
      "I would add an index.",
      "A prepared follow-up.",
    ]);
    await f.session.close();
  });
  test("resumed speech aborts the hidden draft and generates from the complete answer", async () => {
    const signals: AbortSignal[] = [];
    const inputs: string[] = [];
    const f = await fixture(async function* (interview, signal) {
      signals.push(signal);
      inputs.push(interview.messages.at(-1)?.content ?? "");
      yield inputs.length === 1
        ? "A question."
        : inputs.length === 2
          ? "Discard this draft."
          : "A complete follow-up.";
    });
    await f.session.handle({ type: "start" });
    f.emitTurn({
      event: "EagerEndOfTurn",
      transcript: "I would cache it.",
      turn_index: 0,
    });
    await drain();
    expect(signals).toHaveLength(2);
    f.emitTurn({
      event: "TurnResumed",
      transcript: "I would cache it, but",
      turn_index: 0,
    });
    await drain();
    expect(signals[1]!.aborted).toBe(true);
    await f.turn("I would cache it, but invalidate on writes.");
    expect(inputs.at(-1)).toBe("I would cache it, but invalidate on writes.");
    const messages = (await interviews.get(f.interview.id))!.messages;
    expect(messages).toHaveLength(3);
    expect(messages.some((m) => m.content === "Discard this draft.")).toBe(
      false,
    );
    expect(messages.at(-1)?.content).toBe("A complete follow-up.");
    await f.session.close();
  });
  test("a changed final transcript or failed draft uses a fresh final request", async () => {
    for (const failed of [false, true]) {
      let calls = 0;
      const f = await fixture(async function* () {
        calls++;
        if (calls === 2 && failed) throw new Error("Draft provider failure");
        yield calls === 1
          ? "A question."
          : calls === 2
            ? "A stale draft."
            : "A fresh response.";
      });
      await f.session.handle({ type: "start" });
      f.emitTurn({
        event: "EagerEndOfTurn",
        transcript: "Use a cache.",
        turn_index: 0,
      });
      await drain();
      await f.turn(failed ? "Use a cache." : "Use a cache with invalidation.");
      expect(calls).toBe(3);
      expect(
        (await interviews.get(f.interview.id))!.messages.at(-1)?.content,
      ).toBe("A fresh response.");
      expect(f.events.some((event) => event.type === "error")).toBe(false);
      await f.session.close();
    }
  });
  test("opening readiness never starts a speculative technical question", async () => {
    let calls = 0;
    const f = await fixture(
      async function* () {
        calls++;
        yield "First technical question.";
      },
      {},
      "opening",
    );
    await f.session.handle({ type: "start" });
    f.emitTurn({
      event: "EagerEndOfTurn",
      transcript: "Yes, ready.",
      turn_index: 0,
    });
    await drain();
    expect(calls).toBe(0);
    expect((await interviews.get(f.interview.id))!.phase).toBe("opening");
    await f.turn("Yes, ready.");
    expect(calls).toBe(1);
    expect((await interviews.get(f.interview.id))!.phase).toBe("questions");
    await f.session.close();
  });
  test("question playback warms transcription and closing cancels a pending draft", async () => {
    let connections = 0;
    let draftSignal: AbortSignal | undefined;
    let onTurn!: (event: ListenV2TurnInfo) => void;
    const f = await fixture(
      async function* (_interview, signal) {
        draftSignal = signal;
        yield "A question.";
      },
      {
        speechEnabled: true,
        stt: (turn) => {
          onTurn = turn;
          return {
            connect: async () => {
              connections++;
            },
            sendAudio: async () => {},
            endSpeech: () => {},
            close: () => {},
          };
        },
      },
    );
    await f.session.handle({ type: "start" });
    await f.session.handle({ type: "played", responseId: 999 });
    expect(connections).toBe(1);
    await f.session.handle({ type: "prepare-listening", responseId: 999 });
    expect(connections).toBe(1);
    await f.session.handle({ type: "prepare-listening", responseId: 1 });
    expect(connections).toBe(2);
    await f.session.handle({ type: "played", responseId: 1 });
    expect(connections).toBe(3);
    onTurn({
      event: "EagerEndOfTurn",
      transcript: "An answer.",
      turn_index: 0,
    } as ListenV2TurnInfo);
    await drain();
    expect(draftSignal?.aborted).toBe(false);
    await f.session.close();
    await drain();
    expect(draftSignal?.aborted).toBe(true);
    expect((await interviews.get(f.interview.id))!.messages).toHaveLength(1);
  });
  test("a final answer reuses a draft request whose first token is still pending", async () => {
    let calls = 0;
    let release!: () => void;
    const token = new Promise<void>((resolve) => {
      release = resolve;
    });
    const f = await fixture(async function* () {
      calls++;
      if (calls > 1) await token;
      yield calls === 1 ? "A question." : "An already requested follow-up.";
    });
    try {
      await f.session.handle({ type: "start" });
      f.emitTurn({
        event: "EagerEndOfTurn",
        transcript: "My final answer.",
        turn_index: 0,
      });
      await expect.poll(() => calls).toBe(2);
      f.emitTurn({
        event: "EndOfTurn",
        transcript: "My final answer.",
        turn_index: 0,
      });
      await expect
        .poll(
          async () => (await interviews.get(f.interview.id))!.messages.length,
        )
        .toBe(2);
      expect(calls).toBe(2);
      release();
      await drain();
      expect(calls).toBe(2);
      expect(
        (await interviews.get(f.interview.id))!.messages.at(-1)?.content,
      ).toBe("An already requested follow-up.");
    } finally {
      release();
      await f.session.close();
    }
  });
  test("new interviews snapshot the owner's relevant profile without links or pending suggestions", async () => {
    const id = crypto.randomUUID();
    await db
      .insert(user)
      .values({ id, name: "Maya", email: `${id}@example.com` });
    const profile = {
      ...emptyProfile("Maya Chen"),
      headline: "Frontend engineer",
      about: "I build accessible interfaces.",
      stack: ["React", "TypeScript"],
      goal: "Practice explaining trade-offs.",
      portfolioUrl: "https://maya.example/",
      projects: [
        {
          name: "Relay",
          description: "A dashboard",
          role: "Developer",
          stack: ["React"],
          url: "https://relay.example/",
          repositoryUrl: "",
        },
      ],
    };
    await profiles.save(id, profile, true);
    const created = await interviews.create(id, {
      ...settings,
      topics: [...settings.topics],
    });
    await profiles.save(
      id,
      { ...profile, name: "Changed", stack: ["Python"] },
      false,
      {
        step: 0,
        pendingImport: {
          suggestions: { name: "Unapproved" },
          source: "Resume",
          extractedCharacters: 100,
        },
      },
    );
    const saved = (await interviews.get(created.id))!;
    expect(saved.phase).toBe("opening");
    expect(saved.candidate).toEqual({
      name: "Maya Chen",
      headline: profile.headline,
      about: profile.about,
      role: "",
      level: "",
      stack: profile.stack,
      goal: profile.goal,
      projects: [
        {
          name: "Relay",
          description: "A dashboard",
          role: "Developer",
          stack: ["React"],
        },
      ],
    });
    expect(await interviews.owned(created.id, userId)).toBeNull();
  });

  test("the voiced overview waits for readiness and only question playback starts the budget", async () => {
    const deadlines: number[] = [];
    let questions = 0;
    const f = await fixture(
      async function* () {
        questions++;
        yield "How would you test this component?";
      },
      {
        speechEnabled: true,
        scheduleDeadline: async (deadline) => {
          deadlines.push(deadline);
        },
        openingReply: async (interview) =>
          interview.messages.at(-1)?.content === "Yes, let's begin."
            ? { ready: true, text: "" }
            : {
                ready: false,
                text: "We’ll cover React through practical questions. Let me know when you’re ready.",
              },
        tts: (audio) => ({
          connect: async () => {},
          sendText: () => audio(new Uint8Array([1, 0])),
          flush: async () => {},
          close: () => {},
        }),
      },
      "opening",
    );
    try {
      await f.session.handle({ type: "start" });
      let saved = (await interviews.get(f.interview.id))!;
      expect(saved.messages[0]?.content).toContain("We’ll cover React");
      expect(saved.messages[0]?.content).toContain("Ready to begin?");
      expect(saved.messages[0]?.phase).toBe("opening");
      expect(questions).toBe(0);
      expect(f.audioFrames).toHaveLength(1);
      await f.session.handle({ type: "playback-started", responseId: 1 });
      expect((await interviews.get(f.interview.id))?.startedAt).toBeNull();
      await f.turn("Not ready yet.", 0);
      await f.turn("Yes, but first what topics will we cover?", 1);
      await f.session.handle({ type: "playback-started", responseId: 3 });
      expect((await interviews.get(f.interview.id))?.phase).toBe("opening");
      expect(deadlines).toEqual([]);
      expect(questions).toBe(0);
      await f.turn("Yes, let's begin.", 2);
      saved = (await interviews.get(f.interview.id))!;
      expect(saved.phase).toBe("questions");
      expect(saved.startedAt).toBeNull();
      expect(
        saved.messages
          .slice(0, -1)
          .every((message) => message.phase === "opening"),
      ).toBe(true);
      expect(saved.messages.at(-1)?.phase).toBe("questions");
      expect(questions).toBe(1);
      await f.session.handle({ type: "playback-started", responseId: 4 });
      expect((await interviews.get(f.interview.id))?.startedAt).not.toBeNull();
      expect(deadlines).toHaveLength(1);
      await f.turn("I would test the visible behavior.", 3);
      expect(
        (await interviews.get(f.interview.id))?.messages.at(-2)?.phase,
      ).toBe("questions");
    } finally {
      await f.session.close();
    }
  });

  test("reconnect during the opening replays the saved overview without advancing or duplicating it", async () => {
    let calls = 0;
    const f = await fixture(
      async function* () {
        calls++;
        yield "First technical question.";
      },
      { speechEnabled: true },
      "opening",
    );
    await f.session.handle({ type: "start" });
    await f.session.handle({ type: "played", responseId: 1 });
    await f.session.close();
    const reconnected = f.reconnect();
    try {
      await reconnected.handle({ type: "start" });
      const saved = (await interviews.get(f.interview.id))!;
      expect(saved.phase).toBe("opening");
      expect(saved.startedAt).toBeNull();
      expect(saved.messages).toHaveLength(1);
      expect(calls).toBe(0);
      await f.turn("Ready.");
      expect((await interviews.get(f.interview.id))?.phase).toBe("questions");
      expect(calls).toBe(1);
    } finally {
      await reconnected.close();
    }
  });

  test("a failed readiness decision can be retried without silently starting questions", async () => {
    let fail = true;
    let questions = 0;
    const f = await fixture(
      async function* () {
        questions++;
        yield "First question.";
      },
      {
        openingReply: async () => {
          if (fail) throw new Error("Provider unavailable");
          return { ready: true, text: "" };
        },
      },
      "opening",
    );
    try {
      await f.session.handle({ type: "start" });
      await f.turn("Ready.");
      expect((await interviews.get(f.interview.id))?.phase).toBe("opening");
      expect(questions).toBe(0);
      expect(f.events).toContainEqual(
        expect.objectContaining({ type: "error", scope: "llm" }),
      );
      fail = false;
      await f.session.handle({ type: "start" });
      expect((await interviews.get(f.interview.id))?.phase).toBe("questions");
      expect(questions).toBe(1);
    } finally {
      await f.session.close();
    }
  });

  test("an interrupted readiness decision cannot advance the saved phase later", async () => {
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const began = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const f = await fixture(
      async function* () {
        yield "Must not be asked.";
      },
      {
        openingReply: async () => {
          entered();
          await gate;
          return { ready: true, text: "" };
        },
      },
      "opening",
    );
    try {
      await f.session.handle({ type: "start" });
      const answering = f.turn("Ready.");
      await began;
      await f.session.interrupt();
      release();
      await answering;
      expect((await interviews.get(f.interview.id))?.phase).toBe("opening");
      expect((await interviews.get(f.interview.id))?.messages).toHaveLength(2);
    } finally {
      release();
      await f.session.close();
    }
  });

  test("speech completes without waiting for the finalized question's database write", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let flushed = false;
    const f = await fixture(
      async function* () {
        yield "Explain React hooks.";
      },
      {
        speechEnabled: true,
        store: {
          ...interviews,
          addMessage: async (...args) => {
            await gate;
            return interviews.addMessage(...args);
          },
        },
        tts: (audio) => ({
          connect: async () => {},
          sendText: () => audio(new Uint8Array([1, 0])),
          flush: async () => {
            flushed = true;
          },
          close: () => {},
        }),
      },
    );
    const opening = f.session.handle({ type: "start" });
    await expect.poll(() => flushed).toBe(true);
    expect(f.audioFrames).toHaveLength(1);
    expect(f.events.some((event) => event.type === "message")).toBe(false);
    release();
    await opening;
    expect((await interviews.get(f.interview.id))!.messages).toHaveLength(1);
    await f.session.close();
  });
  test("barge-in words arrive before interruption persistence and the final answer retains order", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const f = await fixture(
      async function* () {
        yield "Explain React hooks.";
      },
      {
        speechEnabled: true,
        store: {
          ...interviews,
          interruptMessage: async (id) => {
            await gate;
            return interviews.interruptMessage(id);
          },
        },
      },
    );
    await f.session.handle({ type: "start" });
    f.emitTurn({
      event: "StartOfTurn",
      transcript: "I use hooks.",
      turn_index: 0,
    });
    expect(f.events.at(-1)).toEqual({ type: "partial", text: "I use hooks." });
    const final = f.turn("I use hooks.");
    const finishing = f.session.finish(false);
    release();
    await Promise.all([final, finishing]);
    const saved = (await interviews.get(f.interview.id))!;
    expect(saved.status).toBe("completed");
    expect(
      saved.messages.map((message) => [
        message.role,
        message.status,
        message.content,
      ]),
    ).toEqual([
      ["assistant", "interrupted", "Explain React hooks."],
      ["user", "complete", "I use hooks."],
    ]);
    await f.session.close();
  });
  test("interim transcripts arrive synchronously without database reads and stale turns stay closed", async () => {
    let reads = 0;
    const f = await fixture(
      async function* () {
        yield "Explain React hooks.";
      },
      {
        store: {
          ...interviews,
          get: async (id) => {
            reads++;
            return interviews.get(id);
          },
        },
      },
    );
    await f.session.handle({ type: "start" });
    reads = 0;
    f.emitTurn({
      event: "StartOfTurn",
      transcript: "I use React",
      turn_index: 0,
    });
    f.emitTurn({
      event: "Update",
      transcript: "I use React hooks.",
      turn_index: 0,
    });
    expect(f.events.at(-1)).toEqual({
      type: "partial",
      text: "I use React hooks.",
    });
    expect(reads).toBe(0);
    await drain();
    await f.turn("I use React hooks.");
    expect(reads).toBe(1); // Final status/context read; insert deduplicates atomically.
    const before = f.events.length;
    reads = 0;
    f.emitTurn({ event: "Update", transcript: "Old partial", turn_index: 0 });
    await f.turn("Duplicate answer.");
    expect(f.events).toHaveLength(before);
    expect(reads).toBe(0);
    await f.session.close();
  });
  test("a pending final write does not delay or clear the next turn's partial words", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let writing = false;
    const f = await fixture(
      async function* () {
        yield "Explain React hooks.";
      },
      {
        store: {
          ...interviews,
          addMessage: async (...args) => {
            if (args[1] === "user" && args[2] === "First answer.") {
              writing = true;
              await gate;
            }
            return interviews.addMessage(...args);
          },
        },
      },
    );
    await f.session.handle({ type: "start" });
    const final = f.turn("First answer.");
    await expect.poll(() => writing).toBe(true);
    f.emitTurn({ event: "StartOfTurn", transcript: "Also", turn_index: 1 });
    f.emitTurn({
      event: "Update",
      transcript: "Also consider cleanup.",
      turn_index: 1,
    });
    expect(f.events.at(-1)).toEqual({
      type: "partial",
      text: "Also consider cleanup.",
    });
    release();
    await final;
    expect(f.events.filter((event) => event.type === "partial").at(-1)).toEqual(
      { type: "partial", text: "Also consider cleanup." },
    );
    await f.turn("Also consider cleanup.", 1);
    const messages = (await interviews.get(f.interview.id))!.messages;
    expect(
      messages
        .filter((message) => message.role === "user")
        .map((message) => message.content),
    ).toEqual(["First answer.", "Also consider cleanup."]);
    await f.session.close();
  });
  test("a slow speech handshake does not block text and preserves queued speech in order", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tokens = ["Explain ", "React ", "hooks."];
    const spoken: string[] = [];
    let flushes = 0;
    const f = await fixture(
      async function* () {
        yield* tokens;
      },
      {
        speechEnabled: true,
        tts: () => ({
          connect: () => gate,
          sendText: (text) => {
            spoken.push(text);
          },
          flush: async () => {
            flushes++;
          },
          close: () => {},
        }),
      },
    );
    const opening = f.session.handle({ type: "start" });
    await expect
      .poll(() => f.events.filter((event) => event.type === "delta").length)
      .toBe(3);
    expect(spoken).toEqual([]);
    expect(flushes).toBe(0);
    release();
    await opening;
    expect(spoken).toEqual(tokens);
    expect(flushes).toBe(1);
    await f.session.close();
  });
  test("interrupting a pending speech handshake discards all queued text and audio", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const spoken: string[] = [];
    let flushes = 0;
    const f = await fixture(
      async function* () {
        yield "An obsolete question.";
      },
      {
        speechEnabled: true,
        tts: (audio) => ({
          connect: () => gate,
          sendText: (text) => {
            spoken.push(text);
            audio(new Uint8Array([1, 0]));
          },
          flush: async () => {
            flushes++;
          },
          close: () => {},
        }),
      },
    );
    const opening = f.session.handle({ type: "start" });
    await expect
      .poll(() => f.events.some((event) => event.type === "delta"))
      .toBe(true);
    await f.session.interrupt();
    release();
    await opening;
    expect(spoken).toEqual([]);
    expect(f.audioFrames).toEqual([]);
    expect(flushes).toBe(0);
    expect((await interviews.get(f.interview.id))!.messages[0]?.status).toBe(
      "interrupted",
    );
    await f.session.close();
  });
  test("whole-session pause freezes the persisted budget and output, then resumes buffered speech and answers", async () => {
    let now = Date.now();
    const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const deadlines: number[] = [];
    let canceled = 0;
    const f = await fixture(
      async function* () {
        yield "Explain a cache. ";
        await gate;
        yield "Include invalidation.";
      },
      {
        speechEnabled: true,
        scheduleDeadline: async (deadline) => {
          deadlines.push(deadline);
        },
        cancelDeadline: async () => {
          canceled++;
        },
        tts: (audio) => ({
          connect: async () => {},
          sendText: () => audio(new Uint8Array([1, 0, 2, 0])),
          flush: async () => {},
          close: () => {},
        }),
      },
    );
    try {
      const opening = f.session.handle({ type: "start" });
      await expect.poll(() => f.audioFrames.length).toBe(1);
      await f.session.handle({ type: "playback-started", responseId: 1 });
      const startedAt = (await interviews.get(f.interview.id))!.startedAt!;
      now += 1500;
      const pause = () =>
        f.session.handle({
          type: "pause",
          paused: true,
          requestId: crypto.randomUUID(),
        });
      await pause();
      const pausedAt = (await interviews.get(f.interview.id))!.pausedAt;
      const events = f.events.length;
      const audio = f.audioFrames.length;
      release();
      await opening;
      expect(f.events).toHaveLength(events);
      expect(f.audioFrames).toHaveLength(audio);
      now += 120000;
      await pause(); // Repeated pause cannot move the frozen point.
      const paused = (await interviews.get(f.interview.id))!;
      expect(paused.pausedAt).toBe(pausedAt);
      expect(interviewElapsedMs(paused, now)).toBe(1500);
      f.emitTurn({
        event: "EndOfTurn",
        transcript: "I would invalidate on writes.",
        turn_index: 0,
      });
      await drain();
      expect(
        (await interviews.get(f.interview.id))!.messages.filter(
          (message) => message.role === "user",
        ),
      ).toHaveLength(0);
      await f.session.handle({
        type: "pause",
        paused: false,
        requestId: crypto.randomUUID(),
      });
      await drain();
      const resumed = (await interviews.get(f.interview.id))!;
      expect(resumed.pausedAt).toBeNull();
      expect(resumed.pausedMs).toBe(120000);
      expect(resumed.startedAt).toBe(startedAt);
      expect(interviewElapsedMs(resumed, now)).toBe(1500);
      expect(deadlines.at(-1)).toBe(
        startedAt + settings.duration * 60000 + 120000,
      );
      expect(canceled).toBeGreaterThan(0);
      expect(f.events).toContainEqual(
        expect.objectContaining({
          type: "delta",
          text: "Include invalidation.",
        }),
      );
      expect(f.audioFrames.length).toBeGreaterThan(audio);
      expect(
        resumed.messages.some(
          (message) => message.content === "I would invalidate on writes.",
        ),
      ).toBe(true);
      now += 500;
      await f.session.handle({
        type: "pause",
        paused: true,
        requestId: crypto.randomUUID(),
      });
      now += 10000;
      f.emitTurn({
        event: "EndOfTurn",
        transcript: "I also need to handle concurrent writes.",
        turn_index: 1,
      });
      await drain();
      await f.session.finish(false);
      expect(
        (await interviews.get(f.interview.id))!.messages.at(-1)?.content,
      ).toBe("I also need to handle concurrent writes.");
      expect(
        interviewElapsedMs((await interviews.get(f.interview.id))!, now),
      ).toBe(2000);
    } finally {
      release();
      await f.session.close();
      clock.mockRestore();
    }
  });
  test("the clock waits for opening audio playback and acknowledgements cannot extend it", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const deadlines: number[] = [];
    const f = await fixture(
      async function* () {
        yield "Explain an HTTP cache.";
      },
      {
        speechEnabled: true,
        scheduleDeadline: async (deadline) => {
          deadlines.push(deadline);
        },
        tts: (audio) => ({
          connect: async () => {},
          sendText: () => {},
          flush: async () => {
            await gate;
            audio(new Uint8Array([1, 0, 2, 0]));
          },
          close: () => {},
        }),
      },
    );
    const opening = f.session.handle({ type: "start" });
    await expect
      .poll(() => f.events.some((event) => event.type === "message"))
      .toBe(true);
    expect((await interviews.get(f.interview.id))?.status).toBe("active");
    expect((await interviews.get(f.interview.id))?.startedAt).toBeNull();
    expect(deadlines).toEqual([]);
    await f.session.handle({ type: "playback-started", responseId: 1 });
    expect((await interviews.get(f.interview.id))?.startedAt).toBeNull();
    release();
    await opening;
    expect(f.audioFrames).toHaveLength(1);
    expect((await interviews.get(f.interview.id))?.startedAt).toBeNull();
    await f.session.handle({ type: "playback-started", responseId: 999 });
    expect(deadlines).toEqual([]);
    const beforePlayback = Date.now();
    await f.session.handle({ type: "playback-started", responseId: 1 });
    const startedAt = (await interviews.get(f.interview.id))!.startedAt!;
    expect(startedAt).toBeGreaterThanOrEqual(beforePlayback);
    expect(deadlines).toEqual([startedAt + settings.duration * 60000]);
    expect(f.events).toContainEqual(
      expect.objectContaining({
        type: "ready",
        interview: expect.objectContaining({ startedAt }),
      }),
    );
    await f.session.handle({ type: "playback-started", responseId: 1 });
    await f.session.handle({ type: "speak" });
    await f.session.handle({ type: "playback-started", responseId: 2 });
    expect((await interviews.get(f.interview.id))?.startedAt).toBe(startedAt);
    expect(deadlines).toEqual([startedAt + settings.duration * 60000]);
    await f.session.close();
  });
  test("failed opening speech does not consume time and retry starts the clock", async () => {
    let fail = true;
    const deadlines: number[] = [];
    const f = await fixture(
      async function* () {
        yield "Explain a cache.";
      },
      {
        speechEnabled: true,
        scheduleDeadline: async (deadline) => {
          deadlines.push(deadline);
        },
        tts: (audio) => ({
          connect: async () => {
            if (fail) throw new Error("Speech unavailable");
          },
          sendText: () => audio(new Uint8Array([1, 0, 2, 0])),
          flush: async () => {},
          close: () => {},
        }),
      },
    );
    await f.session.handle({ type: "start" });
    await f.session.handle({ type: "playback-started", responseId: 1 });
    expect((await interviews.get(f.interview.id))?.startedAt).toBeNull();
    expect(deadlines).toEqual([]);
    fail = false;
    await f.session.handle({ type: "speak" });
    await f.session.handle({ type: "playback-started", responseId: 2 });
    expect((await interviews.get(f.interview.id))?.startedAt).not.toBeNull();
    expect(deadlines).toHaveLength(1);
    await f.session.close();
  });
  test("finishing during clock persistence cancels the newly scheduled deadline", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let scheduled = false,
      cancelled = false;
    const f = await fixture(
      async function* () {
        yield "Explain a cache.";
      },
      {
        speechEnabled: true,
        scheduleDeadline: async () => {
          scheduled = true;
          await gate;
        },
        cancelDeadline: async () => {
          cancelled = true;
        },
        tts: (audio) => ({
          connect: async () => {},
          sendText: () => audio(new Uint8Array([1, 0])),
          flush: async () => {},
          close: () => {},
        }),
      },
    );
    await f.session.handle({ type: "start" });
    const clock = f.session.handle({ type: "playback-started", responseId: 1 });
    await expect.poll(() => scheduled).toBe(true);
    const finishing = f.session.finish(false);
    release();
    await Promise.all([clock, finishing]);
    expect(cancelled).toBe(true);
    expect((await interviews.get(f.interview.id))?.status).toBe("completed");
    await f.session.close();
  });
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
    const f = await fixture(
      async function* () {
        yield "Explain a cache invalidation strategy.";
      },
      {
        speechEnabled: true,
        tts: (audio) => ({
          connect: async () => {},
          sendText: () => audio(new Uint8Array([1, 0])),
          flush: async () => {},
          close: () => {},
        }),
      },
    );
    await f.session.handle({ type: "start" });
    await f.session.handle({ type: "playback-started", responseId: 1 });
    await f.turn("I would invalidate on writes.");
    await f.session.handle({ type: "played", responseId: 2 });
    const began = (await interviews.get(f.interview.id))!.startedAt;
    expect(began).not.toBeNull();
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
      openingReply: async () => ({ ready: true, text: "" }),
      feedback: async () => {},
      stt: (turn) => {
        onTurn = turn;
        return {
          connect: async () => {
            connected = true;
          },
          endSpeech: () => {},
          sendAudio: async () => {
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
    const beforeInterrupt = f.events.length;
    await f.session.interrupt();
    expect(f.events.slice(beforeInterrupt)).toContainEqual({
      type: "status",
      status: "listening",
    });
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
          endSpeech: () => {},
          sendAudio: async () => {},
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
