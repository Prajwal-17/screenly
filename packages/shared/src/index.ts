import { z } from "zod";

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
    .min(1)
    .max(6)
    .refine(
      (items) => new Set(items).size === items.length,
      "Choose unique topics",
    ),
  duration: z.union([z.literal(10), z.literal(20), z.literal(30)]),
});
export type InterviewSettings = z.infer<typeof settingsSchema>;
export type InterviewStatus = "draft" | "active" | "completed";
export type FeedbackStatus = "pending" | "generating" | "ready" | "failed";
export type LiveStatus =
  | "connecting"
  | "ready"
  | "listening"
  | "thinking"
  | "speaking"
  | "finishing"
  | "disconnected";

const score = z.number().int().min(0).max(100).nullable();
export const feedbackSchema = z.object({
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
};
export type Interview = InterviewSettings & {
  id: string;
  status: InterviewStatus;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  feedbackStatus: FeedbackStatus;
  feedback: Feedback | null;
  feedbackModel: string | null;
};
export type InterviewDetail = Interview & { messages: InterviewMessage[] };
export type Capabilities = { google: boolean; voice: boolean; llm: boolean };
export const clientEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start"), voice: z.boolean() }),
  z.object({
    type: z.literal("answer"),
    id: z.string().uuid(),
    text: z.string().trim().min(1).max(6000),
  }),
  z.object({ type: z.literal("interrupt") }),
  z.object({
    type: z.literal("played"),
    responseId: z.number().int().nonnegative(),
  }),
  z.object({ type: z.literal("finish") }),
]);
export type ClientEvent = z.infer<typeof clientEventSchema>;
export type ServerEvent =
  | { type: "ready"; interview: InterviewDetail }
  | { type: "status"; status: LiveStatus }
  | { type: "partial"; text: string }
  | { type: "message"; message: InterviewMessage }
  | { type: "delta"; responseId: number; text: string }
  | { type: "audio-start"; responseId: number }
  | { type: "audio-end"; responseId: number }
  | { type: "interrupted"; responseId: number }
  | { type: "finished"; id: string }
  | { type: "error"; message: string; scope: "voice" | "llm" | "session" };

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
