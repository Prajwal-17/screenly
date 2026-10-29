import OpenAI from "openai";
import {
  PROMPT_VERSION,
  REVIEW_CONTEXT_CHARACTER_LIMIT,
  RUBRIC_VERSION,
  reviewDimensions,
  rolePreset,
  sessionReviewSchema,
  type InterviewDetail,
  type SessionReview,
} from "@repo/shared";
import type { Config } from "../config";
import { transcriptRevision } from "../db/interviews";
import { reviewerPrompt } from "../prompts/reviewer";
import { roleRubric } from "../prompts/roles";

export class ReviewError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function reviewInput(interview: InterviewDetail) {
  if (interview.status !== "completed")
    throw new ReviewError(
      "NOT_COMPLETED",
      "Complete the interview before reviewing it.",
    );
  const role = interview.preparation?.role ?? interview.role;
  const level = interview.preparation?.level ?? interview.level;
  const rubricVersion = interview.preparation?.rubricVersion ?? RUBRIC_VERSION;
  const promptVersion = interview.preparation?.promptVersion ?? PROMPT_VERSION;
  if (rubricVersion !== RUBRIC_VERSION || promptVersion !== PROMPT_VERSION)
    throw new ReviewError(
      "VERSION_UNAVAILABLE",
      "The frozen review version is unavailable.",
    );
  if (role !== interview.role || level !== interview.level)
    throw new ReviewError(
      "SETTING_MISMATCH",
      "The frozen review settings do not match this session.",
    );
  const metadata = {
    schemaVersion: 2 as const,
    role,
    level,
    rubricVersion,
    promptVersion,
    transcriptRevision: await transcriptRevision(interview.messages),
  };
  const input = JSON.stringify({
    ...metadata,
    brief: {
      objectives:
        interview.preparation?.objectives ?? rolePreset(role).objectives,
      selectedRole: role,
      targetLevel: level,
    },
    // Prior findings and provisional control observations are deliberately
    // excluded. Project text helps interpretation but cannot prove ability.
    projectBackground: interview.candidate
      ? {
          about: interview.candidate.about,
          goal: interview.candidate.goal,
          projects: interview.candidate.projects,
          stack: interview.candidate.stack,
        }
      : null,
    events: interview.events ?? [],
    transcript: interview.messages,
  });
  const system = `${reviewerPrompt}\n\nSelected role and level rubric:\n${roleRubric(role, level)}`;
  if (system.length + input.length > REVIEW_CONTEXT_CHARACTER_LIMIT)
    throw new ReviewError(
      "CONTEXT_LIMIT",
      "The full transcript exceeds the review limit. The transcript remains available.",
    );
  return { metadata, system, input };
}

export function validateReview(
  raw: unknown,
  interview: InterviewDetail,
  revision: string,
): SessionReview {
  const review = sessionReviewSchema.parse(raw);
  const role = interview.preparation?.role ?? interview.role;
  const level = interview.preparation?.level ?? interview.level;
  if (
    review.role !== role ||
    review.level !== level ||
    review.rubricVersion !==
      (interview.preparation?.rubricVersion ?? RUBRIC_VERSION) ||
    review.promptVersion !==
      (interview.preparation?.promptVersion ?? PROMPT_VERSION) ||
    review.transcriptRevision !== revision
  )
    throw new ReviewError(
      "METADATA_MISMATCH",
      "The review metadata does not match its source.",
    );
  const allowed = new Set(rolePreset(role).criterionIds);
  const criteria = new Set<string>();
  const evidence = new Set<string>();
  const messages = new Map(
    interview.messages.map((message) => [message.id, message]),
  );
  for (const finding of review.findings) {
    if (
      !allowed.has(finding.criterionId) ||
      finding.criterionId !== `${role}:${finding.dimension}` ||
      !reviewDimensions.includes(finding.dimension) ||
      criteria.has(finding.criterionId)
    )
      throw new ReviewError(
        "INVALID_CRITERION",
        "A review criterion is invalid or repeated.",
      );
    criteria.add(finding.criterionId);
    for (const ref of finding.evidence) {
      const source = messages.get(ref.messageId);
      const key = `${ref.messageId}:${ref.quote}`;
      if (
        !source ||
        source.role !== "user" ||
        source.phase !== "questions" ||
        source.status !== "complete" ||
        !source.content.trim() ||
        !ref.quote.trim() ||
        !source.content.includes(ref.quote) ||
        evidence.has(key)
      )
        throw new ReviewError(
          "INVALID_EVIDENCE",
          "A review quote is not a unique completed candidate passage.",
        );
      evidence.add(key);
    }
    if (
      finding.assistance === "explicit-help" &&
      !(interview.events ?? []).some(
        (event) => event.type === "hint" && event.exposure === "played",
      )
    )
      throw new ReviewError(
        "UNSUPPORTED_ASSISTANCE",
        "The transcript does not establish delivered explicit help.",
      );
  }
  return review;
}

export class ReviewService {
  constructor(private readonly env: Config) {}

  async generate(interview: InterviewDetail): Promise<SessionReview> {
    if (!this.env.LLM_API_KEY || !this.env.LLM_MODEL)
      throw new ReviewError(
        "PROVIDER_UNAVAILABLE",
        "The review provider is unavailable.",
      );
    const { metadata, system, input } = await reviewInput(interview);
    const client = new OpenAI({
      apiKey: this.env.LLM_API_KEY,
      baseURL: this.env.LLM_BASE_URL,
      timeout: 90000,
      maxRetries: 0,
    });
    const result = await client.chat.completions.create({
      model: this.env.LLM_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: input },
      ],
    });
    if (result.choices[0]?.finish_reason !== "stop")
      throw new ReviewError(
        "INCOMPLETE_RESPONSE",
        "The review response was incomplete.",
      );
    const content = result.choices[0]?.message.content;
    if (!content)
      throw new ReviewError("EMPTY_RESPONSE", "The review response was empty.");
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new ReviewError("INVALID_JSON", "The review response was invalid.");
    }
    return validateReview(parsed, interview, metadata.transcriptRevision);
  }
}
