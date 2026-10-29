import { z } from "zod";
import { levels, reviewDimensions, roles } from "./roles";

// New sessions select only a preset; experience and context are resolved by the server.
export const createInterviewSchema = z.object({ role: z.enum(roles) }).strict();
export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;

export const assessmentLabels = [
  "Demonstrated",
  "Partially demonstrated",
  "Needs work",
  "Not assessed",
] as const;
export const evidenceReferenceSchema = z
  .object({
    messageId: z.string().min(1).max(100),
    quote: z.string().min(1).max(1200),
  })
  .strict();
export const reviewFindingSchema = z
  .object({
    id: z.string().min(1).max(100),
    criterionId: z.string().min(1).max(150),
    dimension: z.enum(reviewDimensions),
    label: z.enum(assessmentLabels),
    observation: z.string().min(1).max(800),
    evidence: z.array(evidenceReferenceSchema).max(8),
    improvement: z.string().min(1).max(800),
    assistance: z.enum([
      "independent",
      "neutral-follow-up",
      "explicit-help",
      "uncertain",
      "not-applicable",
    ]),
  })
  .strict();
export const sessionReviewSchema = z
  .object({
    schemaVersion: z.literal(2),
    role: z.enum(roles),
    level: z.enum(levels),
    rubricVersion: z.string().min(1).max(100),
    promptVersion: z.string().min(1).max(100),
    transcriptRevision: z.string().min(1).max(200),
    summary: z.string().min(1).max(1600),
    findings: z.array(reviewFindingSchema).max(6),
    practicePriority: z
      .object({
        title: z.string().min(1).max(160),
        action: z.string().min(1).max(800),
        strongerExplanation: z.string().min(1).max(800),
      })
      .strict(),
    notAssessed: z.array(z.string().min(1).max(300)).max(5),
    limitations: z.array(z.string().min(1).max(400)).max(5),
  })
  .strict()
  .superRefine((review, ctx) => {
    if (
      new Set(review.findings.map((f) => f.id)).size !== review.findings.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["findings"],
        message: "Finding IDs must be unique.",
      });
    for (const [index, finding] of review.findings.entries()) {
      if (finding.label !== "Not assessed" && !finding.evidence.length)
        ctx.addIssue({
          code: "custom",
          path: ["findings", index, "evidence"],
          message: "Assessed findings require current-session evidence.",
        });
      if (finding.label === "Not assessed" && finding.evidence.length)
        ctx.addIssue({
          code: "custom",
          path: ["findings", index, "evidence"],
          message: "Untested findings must not invent evidence.",
        });
      const refs = finding.evidence.map((e) => `${e.messageId}:${e.quote}`);
      if (new Set(refs).size !== refs.length)
        ctx.addIssue({
          code: "custom",
          path: ["findings", index, "evidence"],
          message: "Duplicate evidence reference.",
        });
    }
  });
export type SessionReview = z.infer<typeof sessionReviewSchema>;
export type ReviewFinding = z.infer<typeof reviewFindingSchema>;
export type EvidenceReference = z.infer<typeof evidenceReferenceSchema>;

export const practiceFindingSchema = z
  .object({
    id: z.string(),
    sourceInterviewId: z.string(),
    sourceReviewVersion: z.string(),
    role: z.enum(roles),
    criterionId: z.string(),
    observation: z.string().max(800),
    practiceFocus: z.string().max(800),
    evidence: z.array(evidenceReferenceSchema).max(8),
    createdAt: z.number(),
    dismissedAt: z.number().nullable(),
  })
  .strict();
export type PracticeFinding = z.infer<typeof practiceFindingSchema>;

export type SessionPreparation = {
  schemaVersion: 2;
  role: (typeof roles)[number];
  level: (typeof levels)[number];
  rubricVersion: string;
  promptVersion: string;
  objectives: string[];
  priorFindings: PracticeFinding[];
  warnings: string[];
  memoryDegraded: boolean;
};
export type SessionEvent = {
  id: string;
  type:
    | "hint"
    | "constraint-change"
    | "interruption"
    | "connection"
    | "transcription";
  messageIds: string[];
  detail: string;
  exposure: "played" | "interrupted" | "unknown" | "not-applicable";
  createdAt: number;
};
export type SessionControlState = {
  revision: number;
  objective: string | null;
  situation: string;
  constraints: string[];
  exploredObjectives: string[];
  unresolvedPoints: string[];
  sourceMessageIds: string[];
};

export const endInterviewSchema = z
  .object({
    reason: z.enum([
      "coverage_complete",
      "candidate_requested_stop",
      "time_reached",
    ]),
  })
  .strict();
export type EndInterviewRequest = z.infer<typeof endInterviewSchema>;
