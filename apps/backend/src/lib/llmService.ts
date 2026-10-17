import OpenAI from "openai";
import {
  feedbackSchema,
  interviewElapsedMs,
  type InterviewDetail,
  type InterviewMessage,
} from "@repo/shared";
import type { Config } from "../config";
import { feedbackPrompt, interviewPrompt } from "../constants";
import { openingPrompt, openingReplySchema } from "./interviewOpening";

// A pause is a transcription boundary, not necessarily a conversational one.
// Keep persisted segments intact for feedback; join adjacent speech for replies.
function conversationMessages(messages: InterviewMessage[]) {
  const result: { role: "user" | "assistant"; content: string }[] = [];
  let phase: InterviewMessage["phase"];
  for (const message of messages) {
    const content =
      (message.phase === "opening" ? "[Opening phase] " : "") +
      message.content +
      (message.status === "interrupted"
        ? " [This reply was interrupted.]"
        : "");
    const previous = result.at(-1);
    if (
      message.role === "user" &&
      previous?.role === "user" &&
      phase === message.phase
    )
      previous.content += `\n\n${content}`;
    else result.push({ role: message.role, content });
    phase = message.phase;
  }
  return result;
}

export function parseFeedback(raw: string, messages: InterviewMessage[]) {
  const feedback = feedbackSchema.parse(
    JSON.parse(
      raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, ""),
    ),
  );
  const candidateIds = new Set(
    messages
      .filter((m) => m.role === "user" && m.phase !== "opening")
      .map((m) => m.id),
  );
  if (feedback.answers.some((answer) => !candidateIds.has(answer.messageId)))
    throw new Error("Feedback referenced an unknown answer.");
  if (
    new Set(feedback.answers.map((answer) => answer.messageId)).size !==
    feedback.answers.length
  )
    throw new Error("Feedback repeated an answer reference.");
  if (candidateIds.size < 2) feedback.overallScore = null;
  if (!candidateIds.size)
    feedback.dimensions.forEach((dimension) => {
      dimension.score = null;
    });
  return feedback;
}

export class LLMService {
  private client: OpenAI;
  constructor(private env: Config) {
    if (!this.env.LLM_API_KEY || !this.env.LLM_MODEL)
      throw new Error(
        "Configure the LLM API key and model to start an interview.",
      );
    this.client = new OpenAI({
      apiKey: this.env.LLM_API_KEY,
      baseURL: this.env.LLM_BASE_URL,
      timeout: 45000,
      maxRetries: 0,
    });
  }
  async openingReply(interview: InterviewDetail, signal: AbortSignal) {
    const result = await this.client.chat.completions.create(
      {
        model: this.env.LLM_INTERVIEW_MODEL || this.env.LLM_MODEL!,
        ...(this.env.LLM_INTERVIEW_REASONING_EFFORT
          ? { reasoning_effort: this.env.LLM_INTERVIEW_REASONING_EFFORT }
          : {}),
        ...(this.env.LLM_INTERVIEW_MAX_TOKENS
          ? { max_tokens: this.env.LLM_INTERVIEW_MAX_TOKENS }
          : {}),
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: openingPrompt },
          {
            role: "user",
            content: JSON.stringify({
              settings: {
                role: interview.role,
                level: interview.level,
                topics: interview.topics,
                duration: interview.duration,
              },
              candidateContext: interview.candidate ?? null,
              transcript: interview.messages,
            }),
          },
        ],
      },
      { signal },
    );
    return openingReplySchema.parse(
      JSON.parse(result.choices[0]?.message.content ?? ""),
    );
  }
  async *generateReply(
    interview: InterviewDetail,
    signal: AbortSignal,
  ): AsyncGenerator<string> {
    const remaining =
      interview.duration - interviewElapsedMs(interview) / 60000;
    const stream = await this.client.chat.completions.create(
      {
        model: this.env.LLM_INTERVIEW_MODEL || this.env.LLM_MODEL!,
        ...(this.env.LLM_INTERVIEW_REASONING_EFFORT
          ? { reasoning_effort: this.env.LLM_INTERVIEW_REASONING_EFFORT }
          : {}),
        ...(this.env.LLM_INTERVIEW_MAX_TOKENS
          ? { max_tokens: this.env.LLM_INTERVIEW_MAX_TOKENS }
          : {}),
        messages: [
          {
            role: "system",
            content: interviewPrompt(interview, Math.ceil(remaining)),
          },
          ...(interview.candidate
            ? [
                {
                  role: "user" as const,
                  content: JSON.stringify({
                    candidateContext: interview.candidate,
                  }),
                },
              ]
            : []),
          ...conversationMessages(interview.messages),
        ],
        stream: true,
      },
      { signal },
    );
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) yield text;
    }
  }
  async evaluate(interview: InterviewDetail) {
    const result = await this.client.chat.completions.create({
      model: this.env.LLM_MODEL!,
      messages: [
        { role: "system", content: feedbackPrompt },
        {
          role: "user",
          content: JSON.stringify({
            settings: {
              role: interview.role,
              level: interview.level,
              topics: interview.topics,
            },
            transcript: interview.messages.filter(
              (message) => message.phase !== "opening",
            ),
          }),
        },
      ],
    });
    const raw = result.choices[0]?.message.content ?? "";
    return parseFeedback(raw, interview.messages);
  }
}
