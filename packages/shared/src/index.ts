import { z } from "zod";
import type { ProfileDetails } from "./profile";

export const roles = ["Frontend", "Backend", "Full-stack"] as const;
export const levels = ["Junior", "Mid-level", "Senior"] as const;
export const topics = [
  "JavaScript",
  "React",
  "TypeScript",
  "APIs",
  "Databases",
  "System design",
  "Testing",
  "Web performance",
] as const;
export const settingsSchema = z.object({
  role: z.enum(roles),
  level: z.enum(levels),
  topics: z
    .array(z.enum(topics))
    .min(1, "Choose at least one topic.")
    .max(6, "Choose up to six topics.")
    .refine(
      (items) => new Set(items).size === items.length,
      "Choose unique topics",
    ),
  duration: z.union([z.literal(10), z.literal(20), z.literal(30)]),
});
export type InterviewSettings = z.infer<typeof settingsSchema>;
export type InterviewStatus = "draft" | "active" | "completed";
export type InterviewPhase = "opening" | "questions";
export type InterviewCandidate = Pick<
  ProfileDetails,
  "name" | "headline" | "about" | "role" | "level" | "stack" | "goal"
> & {
  projects: Pick<
    ProfileDetails["projects"][number],
    "name" | "description" | "role" | "stack"
  >[];
};
export type FeedbackStatus =
  "pending" | "generating" | "ready" | "failed" | "skipped";
export const finishInterviewSchema = z
  .object({
    generateFeedback: z.boolean().default(true),
  })
  .strict();
export type LiveStatus =
  | "connecting"
  | "ready"
  | "listening"
  | "thinking"
  | "speaking"
  | "finishing"
  | "disconnected";

const score = z.number().min(0).max(10).multipleOf(0.1).nullable();
export const feedbackSchema = z.object({
  scoreScale: z.literal(10).default(10),
  summary: z.string().min(1).max(2000),
  overallScore: score,
  dimensions: z
    .array(
      z.object({
        name: z.enum([
          "Technical accuracy",
          "Depth & trade-offs",
          "Problem solving",
          "Communication",
        ]),
        score,
        explanation: z.string().min(1).max(1500),
      }),
    )
    .length(4)
    .refine(
      (items) => new Set(items.map((item) => item.name)).size === 4,
      "Each dimension must appear once",
    ),
  strengths: z.array(z.string().min(1).max(500)).max(5),
  improvements: z.array(z.string().min(1).max(500)).max(5),
  answers: z
    .array(
      z.object({
        messageId: z.string(),
        observation: z.string().min(1).max(1500),
        suggestion: z.string().min(1).max(1500),
      }),
    )
    .max(20),
  nextSteps: z.array(z.string().min(1).max(500)).length(3),
});
export type Feedback = z.infer<typeof feedbackSchema>;
export type InterviewMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "complete" | "interrupted";
  createdAt: number;
  phase?: InterviewPhase;
};
export type Interview = InterviewSettings & {
  id: string;
  status: InterviewStatus;
  phase?: InterviewPhase;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  pausedAt?: number | null;
  pausedMs?: number;
  feedbackStatus: FeedbackStatus;
  feedback: Feedback | null;
  feedbackModel: string | null;
};
export type InterviewDetail = Interview & {
  messages: InterviewMessage[];
  candidate?: InterviewCandidate | null;
};
export function interviewElapsedMs(
  interview: Pick<Interview, "startedAt" | "endedAt" | "pausedAt" | "pausedMs">,
  now = Date.now(),
) {
  if (interview.startedAt == null) return 0;
  return Math.max(
    0,
    (interview.endedAt ?? interview.pausedAt ?? now) -
      interview.startedAt -
      (interview.pausedMs ?? 0),
  );
}
export type Capabilities = {
  google: boolean;
  voice: boolean;
  llm: boolean;
  devLogin?: boolean;
};
export const clientEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start") }).strict(),
  z.object({ type: z.literal("speech-start") }).strict(),
  z.object({ type: z.literal("speech-end") }).strict(),
  z
    .object({
      type: z.literal("pause"),
      paused: z.boolean(),
      requestId: z.string().uuid(),
    })
    .strict(),
  z.object({ type: z.literal("interrupt") }),
  z.object({ type: z.literal("speak") }),
  z.object({
    type: z.literal("playback-started"),
    responseId: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("played"),
    responseId: z.number().int().nonnegative(),
  }),
  z
    .object({
      type: z.literal("prepare-listening"),
      responseId: z.number().int().nonnegative(),
    })
    .strict(),
  z.object({
    type: z.literal("finish"),
    generateFeedback: z.boolean().optional(),
  }),
]);
export type ClientEvent = z.infer<typeof clientEventSchema>;
export type ServerEvent =
  | { type: "ready"; interview: InterviewDetail }
  | { type: "pause-state"; interview: InterviewDetail; requestId: string }
  | { type: "status"; status: LiveStatus }
  | { type: "partial"; text: string }
  | { type: "message"; message: InterviewMessage }
  | { type: "delta"; responseId: number; text: string }
  | { type: "audio-start"; responseId: number }
  | { type: "audio-end"; responseId: number }
  | { type: "interrupted"; responseId: number }
  | { type: "finished"; id: string; generateFeedback?: boolean }
  | {
      type: "error";
      message: string;
      scope: "voice" | "speech" | "llm" | "session";
      requestId?: string;
    };

// Prefix speaker audio with its response ID so cancelled replies cannot play late.
export function packAudio(
  responseId: number,
  audio: Uint8Array,
): Uint8Array<ArrayBuffer> {
  const frame = new Uint8Array(4 + audio.byteLength);
  new DataView(frame.buffer).setUint32(0, responseId);
  frame.set(audio, 4);
  return frame;
}
export function unpackAudio(
  frame: ArrayBuffer,
): { responseId: number; audio: ArrayBuffer } | null {
  if (frame.byteLength < 6 || frame.byteLength % 2 !== 0) return null;
  return {
    responseId: new DataView(frame).getUint32(0),
    audio: frame.slice(4),
  };
}

export * from "./profile";
