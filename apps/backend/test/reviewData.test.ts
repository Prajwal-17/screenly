import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database as SQLite } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import {
  PROMPT_VERSION,
  RUBRIC_VERSION,
  type InterviewDetail,
  type SessionReview,
  emptyProfile,
} from "@repo/shared";
import {
  createInterviews,
  MissingExperienceLevelError,
  transcriptRevision,
} from "../src/db/interviews";
import { createMemory } from "../src/db/memory";
import type { Database } from "../src/db";
import { reviewInput, validateReview } from "../src/lib/reviewService";

const directory = new URL("../drizzle/", import.meta.url);
const migrations = await Promise.all(
  [
    "0000_init.sql",
    "0001_classy_northstar.sql",
    "0002_married_betty_brant.sql",
  ].map((name) => Bun.file(new URL(name, directory)).text()),
);
let sqlite: SQLite;
let db: Database;

const detail = (): InterviewDetail => ({
  id: "session",
  role: "Backend",
  level: "Mid-level",
  topics: [],
  duration: 20,
  status: "completed",
  phase: "questions",
  createdAt: 1,
  startedAt: 1,
  endedAt: 3,
  feedbackStatus: "pending",
  feedback: null,
  feedbackModel: null,
  messages: [
    {
      id: "opening",
      role: "user",
      content: "Ready",
      phase: "opening",
      status: "complete",
      createdAt: 1,
    },
    {
      id: "answer",
      role: "user",
      content:
        "A retry can create two orders. I would key the write and return the first result.",
      phase: "questions",
      status: "complete",
      createdAt: 2,
    },
    {
      id: "assistant",
      role: "assistant",
      content: "Use an idempotency key",
      phase: "questions",
      status: "interrupted",
      createdAt: 3,
    },
  ],
});
async function report(interview = detail()): Promise<SessionReview> {
  return {
    schemaVersion: 2,
    role: interview.role,
    level: interview.level,
    rubricVersion: RUBRIC_VERSION,
    promptVersion: PROMPT_VERSION,
    transcriptRevision: await transcriptRevision(interview.messages),
    summary: "The candidate explained duplicate writes.",
    findings: [
      {
        id: "finding-1",
        criterionId: "Backend:technical-understanding",
        dimension: "technical-understanding",
        label: "Demonstrated",
        observation: "The candidate described a retry invariant.",
        evidence: [
          { messageId: "answer", quote: "A retry can create two orders." },
        ],
        improvement: "Explain the atomic write boundary.",
        assistance: "independent",
      },
    ],
    practicePriority: {
      title: "Write boundary",
      action: "Trace one duplicate write.",
      strongerExplanation: "Name the invariant and transaction boundary.",
    },
    notAssessed: [],
    limitations: [],
  };
}

beforeEach(() => {
  sqlite = new SQLite(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  migrations.forEach((migration) => sqlite.exec(migration));
  db = drizzle(sqlite) as unknown as Database;
  sqlite.run(
    "INSERT INTO user (id,name,email) VALUES ('owner','Owner','owner@example.com'),('other','Other','other@example.com')",
  );
});
afterEach(() => sqlite.close());

test("review rejects stale metadata and non-candidate, opening, interrupted or duplicate evidence", async () => {
  const interview = detail();
  const base = await report(interview);
  expect(validateReview(base, interview, base.transcriptRevision)).toEqual(
    base,
  );
  for (const messageId of ["opening", "assistant", "missing"]) {
    const bad = structuredClone(base);
    bad.findings[0]!.evidence = [
      {
        messageId,
        quote:
          messageId === "opening"
            ? "Ready"
            : messageId === "assistant"
              ? "Use an idempotency key"
              : "A retry",
      },
    ];
    expect(() =>
      validateReview(bad, interview, base.transcriptRevision),
    ).toThrow();
  }
  const repeated = structuredClone(base);
  repeated.findings.push({ ...repeated.findings[0]!, id: "finding-2" });
  expect(() =>
    validateReview(repeated, interview, base.transcriptRevision),
  ).toThrow();
  expect(() =>
    validateReview(
      { ...base, transcriptRevision: "old" },
      interview,
      base.transcriptRevision,
    ),
  ).toThrow();
});

test("review refuses an over-budget original transcript without truncating evidence", async () => {
  const interview = detail();
  interview.messages[1]!.content = "A".repeat(160_000);
  await expect(reviewInput(interview)).rejects.toMatchObject({
    code: "CONTEXT_LIMIT",
  });
  expect(interview.messages[1]!.content).toHaveLength(160_000);
});

test("memory is owner-scoped, dismissal survives retry, and source deletion cascades", async () => {
  const review = await report();
  sqlite
    .query(
      "INSERT INTO interview_session (id,user_id,created_at,updated_at,status,review) VALUES ('session','owner',1,1,'completed',?)",
    )
    .run(JSON.stringify(review));
  const memory = createMemory(db);
  expect(await memory.derive("session", review)).toBe(true);
  const [finding] = await memory.active("owner");
  expect(finding?.evidence).toEqual(review.findings[0]?.evidence);
  expect(await memory.active("other")).toEqual([]);
  expect(await memory.dismiss("other", finding!.id)).toBe(false);
  expect(await memory.dismiss("owner", finding!.id)).toBe(true);
  expect(await memory.derive("session", review)).toBe(true);
  expect(await memory.active("owner")).toEqual([]);
  expect(
    sqlite.query("SELECT count(*) as total FROM practice_finding").get(),
  ).toEqual({ total: 1 });
  sqlite.run("DELETE FROM interview_session WHERE id='session'");
  expect(
    sqlite.query("SELECT count(*) as total FROM practice_finding").get(),
  ).toEqual({ total: 0 });
});

test("claim and transcript revision block overlapping or stale review writes", async () => {
  sqlite.run(
    "INSERT INTO interview_session (id,user_id,created_at,updated_at,status) VALUES ('session','owner',1,1,'completed')",
  );
  sqlite.run(
    "INSERT INTO interview_message (id,interview_id,role,content,source_key,created_at) VALUES ('answer','session','user','Initial','source',1)",
  );
  const store = createInterviews(db);
  const first = await store.claimReview("session");
  expect(first).toBeTruthy();
  expect(await store.claimReview("session")).toBeNull();
  const current = await store.get("session");
  const stale = await report(current!);
  sqlite.run(
    "UPDATE interview_message SET content='Corrected' WHERE id='answer'",
  );
  expect(await store.commitReview("session", first!, stale, "model")).toBe(
    false,
  );
  await store.failReview("session", first!);
  const second = await store.claimReview("session");
  expect(second).toBeTruthy();
  const fresh = await report((await store.get("session"))!);
  expect(await store.commitReview("session", first!, fresh, "model")).toBe(
    false,
  );
  expect(await store.commitReview("session", second!, fresh, "model")).toBe(
    true,
  );
  expect((await store.get("session"))?.review?.transcriptRevision).toBe(
    fresh.transcriptRevision,
  );
});

test("live memory failure continues with the frozen profile and no unchecked findings", async () => {
  const profile = { ...emptyProfile("Owner"), level: "Junior" };
  sqlite
    .query(
      "INSERT INTO user_profile (user_id,details,updated_at) VALUES ('owner',?,1)",
    )
    .run(JSON.stringify(profile));
  const store = createInterviews(db);
  const created = await store.create("owner", "Backend");
  sqlite.exec("DROP TABLE practice_finding");
  const context = await store.liveContext(created.id);
  expect(context?.candidate?.name).toBe("Owner");
  expect(context?.preparation).toMatchObject({
    priorFindings: [],
    memoryDegraded: true,
  });
  expect((await store.get(created.id))?.preparation?.memoryDegraded).toBe(
    false,
  );
});

test("new session uses saved level, freezes approved context and selects same-role memory", async () => {
  const store = createInterviews(db);
  await expect(store.create("owner", "Backend")).rejects.toBeInstanceOf(
    MissingExperienceLevelError,
  );
  const profile = {
    ...emptyProfile("Owner"),
    level: "Junior" as const,
    role: "Frontend" as const,
    goal: "Practice API design",
    about: "I build services",
    projects: [],
    stack: ["TypeScript"],
  };
  sqlite
    .query(
      "INSERT INTO user_profile (user_id,details,updated_at) VALUES ('owner',?,1)",
    )
    .run(JSON.stringify(profile));
  const prior = await report();
  sqlite
    .query(
      "INSERT INTO interview_session (id,user_id,created_at,updated_at,status,review) VALUES ('prior','owner',1,1,'completed',?)",
    )
    .run(JSON.stringify(prior));
  expect(await createMemory(db).derive("prior", prior)).toBe(true);
  const created = await store.create("owner", "Backend");
  expect(created).toMatchObject({
    role: "Backend",
    level: "Junior",
    topics: [],
    duration: 20,
  });
  const snapshot = await store.get(created.id);
  expect(snapshot?.candidate?.level).toBe("Junior");
  expect(snapshot?.preparation?.priorFindings).toHaveLength(1);
  expect(snapshot?.preparation?.objectives.length).toBeGreaterThan(0);
  const findingId = snapshot!.preparation!.priorFindings[0]!.id;
  await createMemory(db).dismiss("owner", findingId);
  expect(
    (await store.get(created.id))?.preparation?.priorFindings,
  ).toHaveLength(1);
  expect(
    (await store.liveContext(created.id))?.preparation?.priorFindings,
  ).toEqual([]);
});

test("completed sessions reject late transcript writes and active control uses source revision", async () => {
  sqlite.run(
    "INSERT INTO interview_session (id,user_id,created_at,updated_at,status) VALUES ('session','owner',1,1,'active')",
  );
  const store = createInterviews(db);
  const message = await store.addMessage(
    "session",
    "user",
    "An explanation",
    "source",
  );
  expect(message?.content).toBe("An explanation");
  const control = {
    revision: 1,
    objective: "API",
    situation: "Explain a service",
    constraints: [],
    exploredObjectives: [],
    unresolvedPoints: [],
    sourceMessageIds: [message!.id],
  };
  expect(await store.saveControl("session", control)).toBe(true);
  expect(await store.saveControl("session", control)).toBe(false);
  await store.addMessage("session", "user", "Correction", "source-2");
  expect(await store.saveControl("session", { ...control, revision: 1 })).toBe(
    false,
  );
  expect(
    await store.addEvent("session", {
      id: "hint-1",
      type: "hint",
      messageIds: [message!.id],
      detail: "Hint played",
      exposure: "played",
      createdAt: 2,
    }),
  ).toBe(true);
  expect(
    await store.addEvent("session", {
      id: "hint-1",
      type: "hint",
      messageIds: [message!.id],
      detail: "Hint played",
      exposure: "played",
      createdAt: 2,
    }),
  ).toBe(false);
  await store.finish("session");
  expect(
    await store.addMessage("session", "user", "Late", "late"),
  ).toBeUndefined();
  expect(
    await store.addEvent("session", {
      id: "late",
      type: "connection",
      messageIds: [],
      detail: "Late",
      exposure: "unknown",
      createdAt: 3,
    }),
  ).toBe(false);
});

test("retains at most twelve active findings and selects only three for the matching role", async () => {
  const memory = createMemory(db);
  for (let index = 0; index < 14; index++) {
    const id = `session-${index}`;
    const next = await report();
    next.transcriptRevision = `revision-${index}`;
    sqlite
      .query(
        "INSERT INTO interview_session (id,user_id,created_at,updated_at,status,review) VALUES (?,'owner',?,?,'completed',?)",
      )
      .run(id, index, index, JSON.stringify(next));
    expect(await memory.derive(id, next)).toBe(true);
  }
  expect((await memory.active("owner")).length).toBe(12);
  expect((await memory.selected("owner", "Backend")).length).toBe(3);
  expect(await memory.selected("owner", "Frontend")).toEqual([]);
  expect(
    sqlite
      .query(
        "SELECT count(*) AS total FROM practice_finding WHERE dismissed_at IS NULL",
      )
      .get(),
  ).toEqual({ total: 12 });
});
