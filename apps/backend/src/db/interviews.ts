import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type {
  Feedback,
  Interview,
  InterviewDetail,
  InterviewMessage,
  InterviewSettings,
  InterviewPhase,
  InterviewRole,
  SessionControlState,
  SessionEvent,
  SessionReview,
} from "@repo/shared";
import {
  DEFAULT_SESSION_MINUTES,
  PROMPT_VERSION,
  RUBRIC_VERSION,
  feedbackSchema,
  rolePreset,
  sessionReviewSchema,
} from "@repo/shared";
import type { Database } from "./index";
import { interviewMessage, interviewSession } from "./schema";
import { createProfiles } from "./profiles";
import { createMemory } from "./memory";
import { interviewCandidate } from "../lib/interviewOpening";

type Row = typeof interviewSession.$inferSelect;
export class MissingExperienceLevelError extends Error {
  constructor() {
    super(
      "Set your experience level in Settings before starting an interview.",
    );
  }
}

export async function transcriptRevision(messages: InterviewMessage[]) {
  const canonical = JSON.stringify(
    messages.map(({ id, role, content, status, phase }) => [
      id,
      role,
      content,
      status,
      phase ?? "questions",
    ]),
  );
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

const controlSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    objective: z.string().max(300).nullable(),
    situation: z.string().max(1500),
    constraints: z.array(z.string().max(400)).max(8),
    exploredObjectives: z.array(z.string().max(300)).max(8),
    unresolvedPoints: z.array(z.string().max(400)).max(8),
    sourceMessageIds: z.array(z.string().max(100)).max(20),
  })
  .strict();
const eventSchema = z
  .object({
    id: z.string().min(1).max(100),
    type: z.enum([
      "hint",
      "constraint-change",
      "interruption",
      "connection",
      "transcription",
    ]),
    messageIds: z.array(z.string().max(100)).max(12),
    detail: z.string().max(800),
    exposure: z.enum(["played", "interrupted", "unknown", "not-applicable"]),
    createdAt: z.number().int().nonnegative(),
  })
  .strict();
export function normalizeStoredFeedback(
  feedback: (Omit<Feedback, "scoreScale"> & { scoreScale?: 10 }) | null,
): Feedback | null {
  if (!feedback || typeof feedback !== "object") return null;
  if (feedback.scoreScale === 10)
    return feedbackSchema.safeParse(feedback).data ?? null;
  if (!Array.isArray(feedback.dimensions)) return null;
  const convert = (score: number | null) =>
    score === null || !Number.isFinite(score) ? null : Math.round(score) / 10;
  return (
    feedbackSchema.safeParse({
      ...feedback,
      scoreScale: 10,
      overallScore: convert(feedback.overallScore),
      dimensions: feedback.dimensions.map((dimension) => ({
        ...dimension,
        score: convert(dimension.score),
      })),
    }).data ?? null
  );
}
function serialize(row: Row): Interview {
  const review = row.review
    ? (sessionReviewSchema.safeParse(row.review).data ?? null)
    : null;
  return {
    id: row.id,
    ...row.settings,
    status: row.status,
    phase: row.phase,
    createdAt: row.createdAt.getTime(),
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    pausedAt: row.pausedAt,
    pausedMs: row.pausedMs,
    feedbackStatus: row.review && !review ? "failed" : row.feedbackStatus,
    feedback: normalizeStoredFeedback(row.feedback),
    feedbackModel: row.feedbackModel,
    review,
    preparation: row.preparation,
  };
}
export function createInterviews(db: Database) {
  return {
    async create(userId: string, input: InterviewRole | InterviewSettings) {
      const profile = await createProfiles(db).get(userId);
      if (!profile.details.level) throw new MissingExperienceLevelError();
      const role = typeof input === "string" ? input : input.role;
      const settings: InterviewSettings = {
        role,
        level: profile.details.level,
        topics: [],
        duration: DEFAULT_SESSION_MINUTES,
      };
      let priorFindings: Awaited<
        ReturnType<ReturnType<typeof createMemory>["selected"]>
      > = [];
      let memoryDegraded = false;
      try {
        priorFindings = await createMemory(db).selected(userId, role);
      } catch {
        memoryDegraded = true;
      }
      const warnings = [
        !profile.details.goal.trim()
          ? "Add a practice goal to make the conversation more relevant."
          : null,
        !profile.details.about.trim() && !profile.details.projects.length
          ? "Add a project or brief background for more tailored examples."
          : null,
      ].filter((warning): warning is string => Boolean(warning));
      const now = new Date();
      const row = await db
        .insert(interviewSession)
        .values({
          id: crypto.randomUUID(),
          userId,
          settings,
          phase: "opening",
          candidate: interviewCandidate(profile.details),
          preparation: {
            schemaVersion: 2,
            role,
            level: settings.level,
            rubricVersion: RUBRIC_VERSION,
            promptVersion: PROMPT_VERSION,
            objectives: [...rolePreset(role).objectives],
            priorFindings,
            warnings,
            memoryDegraded,
          },
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();
      return serialize(row);
    },
    async list(userId: string) {
      return (
        await db
          .select()
          .from(interviewSession)
          .where(eq(interviewSession.userId, userId))
          .orderBy(desc(interviewSession.createdAt))
          .all()
      ).map(serialize);
    },
    async owned(id: string, userId: string) {
      const row = await db
        .select()
        .from(interviewSession)
        .where(
          and(eq(interviewSession.id, id), eq(interviewSession.userId, userId)),
        )
        .get();
      return row ? serialize(row) : null;
    },
    async get(id: string): Promise<InterviewDetail | null> {
      const row = await db
        .select()
        .from(interviewSession)
        .where(eq(interviewSession.id, id))
        .get();
      if (!row) return null;
      return {
        ...serialize(row),
        candidate: row.candidate,
        events: row.events ?? [],
        control: row.control,
        messages: await db
          .select({
            id: interviewMessage.id,
            role: interviewMessage.role,
            content: interviewMessage.content,
            status: interviewMessage.status,
            createdAt: interviewMessage.createdAt,
            phase: interviewMessage.phase,
          })
          .from(interviewMessage)
          .where(eq(interviewMessage.interviewId, id))
          .orderBy(asc(interviewMessage.createdAt), asc(interviewMessage.id))
          .all(),
      };
    },
    async start(id: string) {
      await db
        .update(interviewSession)
        .set({ status: "active", updatedAt: new Date() })
        .where(
          and(
            eq(interviewSession.id, id),
            eq(interviewSession.status, "draft"),
          ),
        )
        .run();
      return (await this.get(id))!;
    },
    async startClock(id: string) {
      await db
        .update(interviewSession)
        .set({ startedAt: Date.now(), updatedAt: new Date() })
        .where(
          and(
            eq(interviewSession.id, id),
            eq(interviewSession.status, "active"),
            eq(interviewSession.phase, "questions"),
            isNull(interviewSession.startedAt),
            isNull(interviewSession.pausedAt),
          ),
        )
        .run();
      return (await this.get(id))!;
    },
    async beginQuestions(id: string) {
      await db
        .update(interviewSession)
        .set({ phase: "questions", updatedAt: new Date() })
        .where(
          and(
            eq(interviewSession.id, id),
            eq(interviewSession.status, "active"),
          ),
        )
        .run();
      return (await this.get(id))!;
    },
    async setPaused(id: string, paused: boolean) {
      const now = Date.now();
      await db
        .update(interviewSession)
        .set(
          paused
            ? {
                pausedAt: sql`coalesce(${interviewSession.pausedAt}, ${now})`,
                updatedAt: new Date(now),
              }
            : {
                pausedMs: sql`${interviewSession.pausedMs} + case when ${interviewSession.pausedAt} is not null and ${interviewSession.startedAt} is not null then max(0, ${now} - ${interviewSession.pausedAt}) else 0 end`,
                pausedAt: null,
                updatedAt: new Date(now),
              },
        )
        .where(
          and(
            eq(interviewSession.id, id),
            eq(interviewSession.status, "active"),
          ),
        )
        .run();
      return (await this.get(id))!;
    },
    async hasMessageSource(id: string, sourceKey: string) {
      return Boolean(
        await db
          .select({ id: interviewMessage.id })
          .from(interviewMessage)
          .where(
            and(
              eq(interviewMessage.interviewId, id),
              eq(interviewMessage.sourceKey, sourceKey),
            ),
          )
          .get(),
      );
    },
    async addMessage(
      id: string,
      role: InterviewMessage["role"],
      content: string,
      sourceKey: string,
      status: InterviewMessage["status"] = "complete",
      phase: InterviewPhase = "questions",
    ) {
      // The session predicate and insert are one statement. A late callback
      // after completion cannot change the canonical review source.
      const inserted = await db.get<
        Record<string, unknown> | unknown[]
      >(sql`insert into interview_message
        (id, interview_id, role, content, source_key, status, phase, created_at)
        select ${crypto.randomUUID()}, ${id}, ${role}, ${content}, ${sourceKey}, ${status}, ${phase},
          max(${Date.now()}, coalesce((select max(created_at) + 1 from interview_message where interview_id = ${id}), 0))
        where exists (select 1 from interview_session where id = ${id} and status in ('draft', 'active'))
        on conflict (interview_id, source_key) do nothing
        returning id, role, content, status, created_at as createdAt, phase`);
      if (!inserted) return undefined;
      const row = Array.isArray(inserted)
        ? {
            id: inserted[0],
            role: inserted[1],
            content: inserted[2],
            status: inserted[3],
            createdAt: inserted[4],
            phase: inserted[5],
          }
        : inserted;
      return row as InterviewMessage;
    },
    async finish(id: string, generateFeedback = true) {
      const now = Date.now();
      await db
        .update(interviewSession)
        .set({
          status: "completed",
          endedAt: now,
          pausedMs: sql`${interviewSession.pausedMs} + case when ${interviewSession.pausedAt} is not null and ${interviewSession.startedAt} is not null then max(0, ${now} - ${interviewSession.pausedAt}) else 0 end`,
          pausedAt: null,
          feedbackStatus: generateFeedback ? "pending" : "skipped",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(interviewSession.id, id),
            eq(interviewSession.status, "active"),
          ),
        )
        .run();
      return (await this.get(id))!;
    },
    async interruptMessage(id: string) {
      return db
        .update(interviewMessage)
        .set({ status: "interrupted" })
        .where(
          and(
            eq(interviewMessage.id, id),
            sql`exists (select 1 from interview_session where id = ${interviewMessage.interviewId} and status = 'active')`,
          ),
        )
        .returning({
          id: interviewMessage.id,
          role: interviewMessage.role,
          content: interviewMessage.content,
          status: interviewMessage.status,
          createdAt: interviewMessage.createdAt,
          phase: interviewMessage.phase,
        })
        .get();
    },
    async feedbackState(id: string, state: "generating" | "failed") {
      await db
        .update(interviewSession)
        .set({ feedbackStatus: state, updatedAt: new Date() })
        .where(
          and(
            eq(interviewSession.id, id),
            eq(interviewSession.status, "completed"),
            isNull(interviewSession.review),
          ),
        )
        .run();
    },
    async liveContext(id: string): Promise<InterviewDetail | null> {
      const detail = await this.get(id);
      if (!detail?.preparation) return detail;
      const owner = await db
        .select({ userId: interviewSession.userId })
        .from(interviewSession)
        .where(eq(interviewSession.id, id))
        .get();
      if (!owner) return null;
      let valid;
      try {
        valid = await createMemory(db).active(owner.userId);
      } catch {
        // An optional memory outage must not stop the interview or reuse a
        // cached finding whose dismissal/deletion can no longer be checked.
        return {
          ...detail,
          preparation: {
            ...detail.preparation,
            priorFindings: [],
            memoryDegraded: true,
          },
        };
      }
      const ids = new Set(valid.map((finding) => finding.id));
      return {
        ...detail,
        preparation: {
          ...detail.preparation,
          priorFindings: detail.preparation.priorFindings.filter((finding) =>
            ids.has(finding.id),
          ),
        },
      };
    },
    async saveControl(id: string, input: SessionControlState) {
      const control = controlSchema.parse(input);
      const detail = await this.get(id);
      if (
        !detail ||
        detail.status !== "active" ||
        control.revision !== detail.messages.length ||
        control.sourceMessageIds.some(
          (source) => !detail.messages.some((message) => message.id === source),
        )
      )
        return false;
      const priorRevision = detail.control?.revision ?? -1;
      if (control.revision <= priorRevision) return false;
      const saved = await db
        .update(interviewSession)
        .set({ control, updatedAt: new Date() })
        .where(
          and(
            eq(interviewSession.id, id),
            eq(interviewSession.status, "active"),
            sql`(select count(*) from interview_message where interview_id = ${id}) = ${control.revision}`,
            sql`coalesce(json_extract(${interviewSession.control}, '$.revision'), -1) = ${priorRevision}`,
          ),
        )
        .returning({ id: interviewSession.id })
        .get();
      return Boolean(saved);
    },
    async addEvent(id: string, input: SessionEvent) {
      const event = eventSchema.parse(input);
      const detail = await this.get(id);
      if (
        !detail ||
        detail.status !== "active" ||
        event.messageIds.some(
          (source) => !detail.messages.some((message) => message.id === source),
        )
      )
        return false;
      const saved = await db
        .update(interviewSession)
        .set({
          events: sql`json_insert(coalesce(${interviewSession.events}, '[]'), '$[#]', json(${JSON.stringify(event)}))`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(interviewSession.id, id),
            eq(interviewSession.status, "active"),
            sql`json_array_length(coalesce(${interviewSession.events}, '[]')) < 64`,
            sql`not exists (select 1 from json_each(coalesce(${interviewSession.events}, '[]')) where json_extract(value, '$.id') = ${event.id})`,
          ),
        )
        .returning({ id: interviewSession.id })
        .get();
      return Boolean(saved);
    },
    async claimReview(id: string) {
      const claim = crypto.randomUUID();
      const now = Date.now();
      const saved = await db
        .update(interviewSession)
        .set({
          reviewClaim: claim,
          reviewClaimedAt: now,
          feedbackStatus: "generating",
          updatedAt: new Date(now),
        })
        .where(
          and(
            eq(interviewSession.id, id),
            eq(interviewSession.status, "completed"),
            sql`(${interviewSession.reviewClaim} is null or ${interviewSession.reviewClaimedAt} < ${now - 180000})`,
          ),
        )
        .returning({ id: interviewSession.id })
        .get();
      return saved ? claim : null;
    },
    async commitReview(
      id: string,
      claim: string,
      review: SessionReview,
      model: string,
    ) {
      const detail = await this.get(id);
      if (
        !detail ||
        detail.status !== "completed" ||
        (await transcriptRevision(detail.messages)) !==
          review.transcriptRevision
      )
        return false;
      const saved = await db
        .update(interviewSession)
        .set({
          review,
          feedbackStatus: "ready",
          feedbackModel: model,
          memoryStatus: "pending",
          reviewClaim: null,
          reviewClaimedAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(interviewSession.id, id),
            eq(interviewSession.status, "completed"),
            eq(interviewSession.reviewClaim, claim),
          ),
        )
        .returning({ id: interviewSession.id })
        .get();
      return Boolean(saved);
    },
    async failReview(id: string, claim: string) {
      await db
        .update(interviewSession)
        .set({
          feedbackStatus: sql`case when ${interviewSession.review} is null then 'failed' else 'ready' end`,
          reviewClaim: null,
          reviewClaimedAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(interviewSession.id, id),
            eq(interviewSession.reviewClaim, claim),
          ),
        )
        .run();
    },
    async memoryState(
      id: string,
      review: SessionReview,
      state: "ready" | "failed",
    ) {
      await db
        .update(interviewSession)
        .set({ memoryStatus: state })
        .where(
          and(
            eq(interviewSession.id, id),
            sql`json_extract(${interviewSession.review}, '$.transcriptRevision') = ${review.transcriptRevision}`,
            sql`json_extract(${interviewSession.review}, '$.rubricVersion') = ${review.rubricVersion}`,
            sql`json_extract(${interviewSession.review}, '$.promptVersion') = ${review.promptVersion}`,
          ),
        )
        .run();
    },
    async pendingMemory(id: string) {
      const row = await db
        .select({ memoryStatus: interviewSession.memoryStatus })
        .from(interviewSession)
        .where(eq(interviewSession.id, id))
        .get();
      return row?.memoryStatus !== "ready";
    },
    async deriveMemory(id: string, review: SessionReview) {
      return createMemory(db).derive(id, review);
    },
    async remove(id: string, userId: string) {
      await db
        .delete(interviewSession)
        .where(
          and(eq(interviewSession.id, id), eq(interviewSession.userId, userId)),
        )
        .run();
    },
    async recoverFeedback() {
      await db
        .update(interviewSession)
        .set({ feedbackStatus: "failed" })
        .where(eq(interviewSession.feedbackStatus, "generating"))
        .run();
    },
  };
}
export type InterviewStore = ReturnType<typeof createInterviews>;
