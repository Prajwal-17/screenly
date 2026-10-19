import { and, asc, desc, eq, sql } from "drizzle-orm";
import type {
  Feedback,
  Interview,
  InterviewDetail,
  InterviewMessage,
  InterviewSettings,
} from "@repo/shared";
import type { Database } from "./index";
import { interviewMessage, interviewSession } from "./schema";

type Row = typeof interviewSession.$inferSelect;
export function normalizeStoredFeedback(
  feedback: (Omit<Feedback, "scoreScale"> & { scoreScale?: 10 }) | null,
): Feedback | null {
  if (!feedback) return null;
  if (feedback.scoreScale === 10) return feedback as Feedback;
  const convert = (score: number | null) =>
    score === null ? null : Math.round(score) / 10;
  return {
    ...feedback,
    scoreScale: 10,
    overallScore: convert(feedback.overallScore),
    dimensions: feedback.dimensions.map((dimension) => ({
      ...dimension,
      score: convert(dimension.score),
    })),
  };
}
function serialize(row: Row): Interview {
  return {
    id: row.id,
    ...row.settings,
    status: row.status,
    createdAt: row.createdAt.getTime(),
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    feedbackStatus: row.feedbackStatus,
    feedback: normalizeStoredFeedback(row.feedback),
    feedbackModel: row.feedbackModel,
  };
}
export function createInterviews(db: Database) {
  return {
    async create(userId: string, settings: InterviewSettings) {
      const now = new Date();
      const row = await db
        .insert(interviewSession)
        .values({
          id: crypto.randomUUID(),
          userId,
          settings,
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
        messages: await db
          .select({
            id: interviewMessage.id,
            role: interviewMessage.role,
            content: interviewMessage.content,
            status: interviewMessage.status,
            createdAt: interviewMessage.createdAt,
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
        .set({ status: "active", startedAt: Date.now(), updatedAt: new Date() })
        .where(
          and(
            eq(interviewSession.id, id),
            eq(interviewSession.status, "draft"),
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
    ) {
      return db
        .insert(interviewMessage)
        .values({
          id: crypto.randomUUID(),
          interviewId: id,
          role,
          content,
          sourceKey,
          status,
          // Compute this inside the write: separate D1 reads can race across events.
          createdAt: sql`max(${Date.now()}, coalesce((select max(${interviewMessage.createdAt}) + 1 from ${interviewMessage} where ${interviewMessage.interviewId} = ${id}), 0))`,
        })
        .onConflictDoNothing()
        .returning({
          id: interviewMessage.id,
          role: interviewMessage.role,
          content: interviewMessage.content,
          status: interviewMessage.status,
          createdAt: interviewMessage.createdAt,
        })
        .get();
    },
    async finish(id: string, generateFeedback = true) {
      await db
        .update(interviewSession)
        .set({
          status: "completed",
          endedAt: Date.now(),
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
        .where(eq(interviewMessage.id, id))
        .returning({
          id: interviewMessage.id,
          role: interviewMessage.role,
          content: interviewMessage.content,
          status: interviewMessage.status,
          createdAt: interviewMessage.createdAt,
        })
        .get();
    },
    async feedbackState(id: string, state: "generating" | "failed") {
      await db
        .update(interviewSession)
        .set({ feedbackStatus: state, updatedAt: new Date() })
        .where(eq(interviewSession.id, id))
        .run();
    },
    async saveFeedback(id: string, feedback: Feedback, model: string) {
      await db
        .update(interviewSession)
        .set({
          feedbackStatus: "ready",
          feedback,
          feedbackModel: model,
          updatedAt: new Date(),
        })
        .where(eq(interviewSession.id, id))
        .run();
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
