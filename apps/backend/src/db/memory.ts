import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import {
  MEMORY_RETAINED_LIMIT,
  MEMORY_SELECTED_LIMIT,
  type InterviewRole,
  type PracticeFinding,
  type SessionReview,
} from "@repo/shared";
import type { Database } from "./index";
import { interviewSession, practiceFinding } from "./schema";

const publicFinding = (
  row: typeof practiceFinding.$inferSelect,
): PracticeFinding => ({
  id: row.id,
  sourceInterviewId: row.sourceInterviewId,
  sourceReviewVersion: row.sourceReviewVersion,
  role: row.role,
  criterionId: row.criterionId,
  observation: row.observation,
  practiceFocus: row.practiceFocus,
  evidence: row.evidence,
  createdAt: row.createdAt,
  dismissedAt: row.dismissedAt,
});

// Both the source and its currently committed report must still exist. This
// makes old revisions and deleted sessions ineligible without rewriting a
// historical preparation snapshot.
export const reviewVersion = (review: SessionReview) =>
  `${review.rubricVersion}:${review.promptVersion}:${review.transcriptRevision}`;
const sourceValid = sql<boolean>`${interviewSession.status} = 'completed' and ${interviewSession.review} is not null and (json_extract(${interviewSession.review}, '$.rubricVersion') || ':' || json_extract(${interviewSession.review}, '$.promptVersion') || ':' || json_extract(${interviewSession.review}, '$.transcriptRevision')) = ${practiceFinding.sourceReviewVersion}`;

export function createMemory(db: Database) {
  return {
    async active(
      userId: string,
      role?: InterviewRole,
      limit = MEMORY_RETAINED_LIMIT,
    ) {
      const rows = await db
        .select({ finding: practiceFinding })
        .from(practiceFinding)
        .innerJoin(
          interviewSession,
          eq(practiceFinding.sourceInterviewId, interviewSession.id),
        )
        .where(
          and(
            eq(practiceFinding.userId, userId),
            eq(interviewSession.userId, userId),
            isNull(practiceFinding.dismissedAt),
            sourceValid,
            ...(role ? [eq(practiceFinding.role, role)] : []),
          ),
        )
        .orderBy(desc(practiceFinding.createdAt), desc(practiceFinding.id))
        .limit(limit)
        .all();
      return rows.map(({ finding }) => publicFinding(finding));
    },
    async selected(userId: string, role: InterviewRole) {
      return this.active(userId, role, MEMORY_SELECTED_LIMIT);
    },
    async dismiss(userId: string, id: string) {
      const row = await db
        .update(practiceFinding)
        .set({
          dismissedAt: sql`coalesce(${practiceFinding.dismissedAt}, ${Date.now()})`,
        })
        .where(
          and(eq(practiceFinding.id, id), eq(practiceFinding.userId, userId)),
        )
        .returning({ id: practiceFinding.id })
        .get();
      return Boolean(row);
    },
    // Call only after an owned, validated review has been committed. The
    // report/version predicate also protects a late retry after replacement.
    async derive(sourceInterviewId: string, review: SessionReview) {
      const source = await db
        .select()
        .from(interviewSession)
        .where(
          and(
            eq(interviewSession.id, sourceInterviewId),
            eq(interviewSession.status, "completed"),
          ),
        )
        .get();
      if (
        !source ||
        source.review?.transcriptRevision !== review.transcriptRevision ||
        source.review?.promptVersion !== review.promptVersion ||
        source.review?.rubricVersion !== review.rubricVersion
      )
        return false;
      const material = review.findings.find(
        (finding) => finding.label !== "Not assessed",
      );
      const version = reviewVersion(review);
      if (!material) {
        await db
          .delete(practiceFinding)
          .where(
            and(
              eq(practiceFinding.sourceInterviewId, sourceInterviewId),
              eq(practiceFinding.sourceReviewVersion, version),
              isNull(practiceFinding.dismissedAt),
            ),
          )
          .run();
        return true;
      }
      const id = `${sourceInterviewId}:${version}:${material.criterionId}`;
      // A same-version explicit regeneration may select a different focus.
      // Replace only active stale records; keep dismissal tombstones.
      await db
        .delete(practiceFinding)
        .where(
          and(
            eq(practiceFinding.sourceInterviewId, sourceInterviewId),
            eq(practiceFinding.sourceReviewVersion, version),
            ne(practiceFinding.id, id),
            isNull(practiceFinding.dismissedAt),
          ),
        )
        .run();
      await db
        .insert(practiceFinding)
        .values({
          id,
          userId: source.userId,
          sourceInterviewId,
          sourceReviewVersion: version,
          role: review.role,
          criterionId: material.criterionId,
          observation: material.observation,
          practiceFocus: material.improvement,
          evidence: material.evidence,
          createdAt: Date.now(),
          dismissedAt: null,
        })
        .onConflictDoUpdate({
          target: practiceFinding.id,
          set: {
            observation: material.observation,
            practiceFocus: material.improvement,
            evidence: material.evidence,
          },
          setWhere: isNull(practiceFinding.dismissedAt),
        })
        .run();
      // Keep tombstones: a retry of the same report must never revive one.
      await db.run(sql`delete from practice_finding where id in (
        select pf.id from practice_finding pf
        join interview_session s on s.id = pf.source_interview_id
        where pf.user_id = ${source.userId} and s.user_id = ${source.userId}
          and pf.dismissed_at is null and s.status = 'completed'
          and s.review is not null
          and (json_extract(s.review, '$.rubricVersion') || ':' || json_extract(s.review, '$.promptVersion') || ':' || json_extract(s.review, '$.transcriptRevision')) = pf.source_review_version
        order by pf.created_at desc, pf.id desc
        limit -1 offset ${MEMORY_RETAINED_LIMIT}
      )`);
      return true;
    },
  };
}
