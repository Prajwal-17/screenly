import { and, asc, desc, eq } from "drizzle-orm";
import type {
  Feedback,
  Interview,
  InterviewDetail,
  InterviewMessage,
  InterviewSettings,
} from "@repo/shared";
import { db } from "./index";
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
export const interviews = {
  create(userId: string, settings: InterviewSettings) {
    const now = new Date();
    const row = db
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
  list(userId: string) {
    return db
      .select()
      .from(interviewSession)
      .where(eq(interviewSession.userId, userId))
      .orderBy(desc(interviewSession.createdAt))
      .all()
      .map(serialize);
  },
  owned(id: string, userId: string) {
    const row = db
      .select()
      .from(interviewSession)
      .where(
        and(eq(interviewSession.id, id), eq(interviewSession.userId, userId)),
      )
      .get();
    return row ? serialize(row) : null;
  },
  get(id: string): InterviewDetail | null {
    const row = db
      .select()
      .from(interviewSession)
      .where(eq(interviewSession.id, id))
      .get();
    if (!row) return null;
    return {
      ...serialize(row),
      messages: db
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
  start(id: string) {
    db.update(interviewSession)
      .set({ status: "active", startedAt: Date.now(), updatedAt: new Date() })
      .where(
        and(eq(interviewSession.id, id), eq(interviewSession.status, "draft")),
      )
      .run();
    return this.get(id)!;
  },
  hasMessageSource(id: string, sourceKey: string) {
    return Boolean(
      db
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
  addMessage(
    id: string,
    role: InterviewMessage["role"],
    content: string,
    sourceKey: string,
    status: InterviewMessage["status"] = "complete",
  ) {
    const last = db
      .select({ createdAt: interviewMessage.createdAt })
      .from(interviewMessage)
      .where(eq(interviewMessage.interviewId, id))
      .orderBy(desc(interviewMessage.createdAt))
      .get();
    return db
      .insert(interviewMessage)
      .values({
        id: crypto.randomUUID(),
        interviewId: id,
        role,
        content,
        sourceKey,
        status,
        createdAt: Math.max(Date.now(), (last?.createdAt ?? 0) + 1),
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
  finish(id: string) {
    db.update(interviewSession)
      .set({ status: "completed", endedAt: Date.now(), updatedAt: new Date() })
      .where(
        and(eq(interviewSession.id, id), eq(interviewSession.status, "active")),
      )
      .run();
    return this.get(id)!;
  },
  interruptMessage(id: string) {
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
  feedbackState(id: string, state: "generating" | "failed") {
    db.update(interviewSession)
      .set({ feedbackStatus: state, updatedAt: new Date() })
      .where(eq(interviewSession.id, id))
      .run();
  },
  saveFeedback(id: string, feedback: Feedback, model: string) {
    db.update(interviewSession)
      .set({
        feedbackStatus: "ready",
        feedback,
        feedbackModel: model,
        updatedAt: new Date(),
      })
      .where(eq(interviewSession.id, id))
      .run();
  },
  remove(id: string, userId: string) {
    db.delete(interviewSession)
      .where(
        and(eq(interviewSession.id, id), eq(interviewSession.userId, userId)),
      )
      .run();
  },
  recoverFeedback() {
    db.update(interviewSession)
      .set({ feedbackStatus: "failed" })
      .where(eq(interviewSession.feedbackStatus, "generating"))
      .run();
  },
};
