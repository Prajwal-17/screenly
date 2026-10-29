import { z } from "zod";
import type {
  InterviewCandidate,
  InterviewDetail,
  ProfileDetails,
} from "@repo/shared";
import { openingInstructions } from "../prompts/opening";

// Snapshot only interview-relevant, approved fields. Links and contact details
// have no role in the conversation, and pending import suggestions stay private.
export function interviewCandidate(
  profile: ProfileDetails,
): InterviewCandidate {
  return {
    name: profile.name,
    headline: profile.headline,
    about: profile.about,
    role: profile.role,
    level: profile.level,
    stack: profile.stack,
    goal: profile.goal,
    projects: profile.projects.map(({ name, description, role, stack }) => ({
      name,
      description,
      role,
      stack,
    })),
  };
}

const spokenList = (items: readonly string[]) =>
  items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

export function interviewWelcome(interview: InterviewDetail) {
  const name = interview.candidate?.name.trim().split(/\s+/)[0];
  const skills = interview.candidate?.stack.slice(0, 2) ?? [];
  const context = skills.length
    ? ` I can draw on your experience with ${spokenList(skills)} where it fits.`
    : "";
  return `${name ? `Hi ${name}.` : "Hi there."} This is a ${interview.duration}-minute ${interview.role.toLowerCase()} practice conversation.${context} I’ll ask about practical decisions and follow up on your explanations. You’ll get a review afterward. Ready to begin?`;
}

export const openingReplySchema = z.discriminatedUnion("ready", [
  z.object({ ready: z.literal(true), text: z.literal("") }).strict(),
  z
    .object({
      ready: z.literal(false),
      text: z.string().trim().min(1).max(900),
    })
    .strict(),
]);
export type OpeningReply = z.infer<typeof openingReplySchema>;

export const openingPrompt = openingInstructions;
