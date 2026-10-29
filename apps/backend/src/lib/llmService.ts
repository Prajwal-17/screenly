import OpenAI from "openai";
import {
  feedbackSchema,
  LIVE_CONTEXT_CHARACTER_LIMIT,
  type InterviewDetail,
  type InterviewMessage,
} from "@repo/shared";
import type { Config } from "../config";
import { openingPrompt, openingReplySchema } from "./interviewOpening";
import { liveMessages, LiveContextBudgetError } from "./interviewContext";
import {
  EndToolStream,
  endInterviewTool,
  type ReplyPart,
} from "./interviewerTools";

// Legacy numeric feedback parsing remains for compatibility with historical tests.
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

export class InvalidOpeningReplyError extends Error {
  readonly code = "INVALID_OPENING_RESPONSE";
  constructor(readonly model: string) {
    super("The configured model did not return a valid readiness decision.");
    this.name = "InvalidOpeningReplyError";
  }
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
    const messages = [
      { role: "system" as const, content: openingPrompt },
      {
        role: "user" as const,
        content: JSON.stringify({
          settings: {
            role: interview.role,
            level: interview.level,
            duration: interview.duration,
            promptVersion: interview.preparation?.promptVersion ?? null,
          },
          candidateContext: interview.candidate ?? null,
          transcript: interview.messages,
        }),
      },
    ];
    const characters = JSON.stringify(messages).length;
    if (characters > LIVE_CONTEXT_CHARACTER_LIMIT)
      throw new LiveContextBudgetError(characters);
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
        messages,
      },
      { signal },
    );
    try {
      return openingReplySchema.parse(
        JSON.parse(result.choices[0]?.message.content ?? ""),
      );
    } catch {
      // A compatible gateway may return HTTP 200 with a provider failure as
      // message content. Never treat that text as readiness or speak it aloud.
      throw new InvalidOpeningReplyError(
        this.env.LLM_INTERVIEW_MODEL || this.env.LLM_MODEL!,
      );
    }
  }
  async *generateReply(
    interview: InterviewDetail,
    signal: AbortSignal,
  ): AsyncGenerator<ReplyPart> {
    const assemblyStarted = performance.now();
    const { messages, characters } = liveMessages(interview);
    console.info(
      JSON.stringify({
        event: "interviewer_context_assembled",
        elapsedMs: Math.round(performance.now() - assemblyStarted),
        inputCharacters: characters,
      }),
    );
    const requestStarted = performance.now();
    const stream = await this.client.chat.completions.create(
      {
        model: this.env.LLM_INTERVIEW_MODEL || this.env.LLM_MODEL!,
        ...(this.env.LLM_INTERVIEW_REASONING_EFFORT
          ? { reasoning_effort: this.env.LLM_INTERVIEW_REASONING_EFFORT }
          : {}),
        ...(this.env.LLM_INTERVIEW_MAX_TOKENS
          ? { max_tokens: this.env.LLM_INTERVIEW_MAX_TOKENS }
          : {}),
        messages,
        ...(interview.preparation
          ? { tools: [endInterviewTool], tool_choice: "auto" as const }
          : {}),
        stream: true,
      },
      { signal },
    );
    const tool = new EndToolStream();
    let finishReason: string | null = null;
    let firstOutputLogged = false;
    const logFirstOutput = () => {
      if (firstOutputLogged) return;
      firstOutputLogged = true;
      console.info(
        JSON.stringify({
          event: "interviewer_first_model_output",
          elapsedMs: Math.round(performance.now() - requestStarted),
          inputCharacters: characters,
          model: this.env.LLM_INTERVIEW_MODEL || this.env.LLM_MODEL,
        }),
      );
    };
    for await (const chunk of stream) {
      if (signal.aborted) return;
      const reason = chunk.choices[0]?.finish_reason;
      if (reason) finishReason = reason;
      const text = chunk.choices[0]?.delta?.content;
      const deltas = chunk.choices[0]?.delta?.tool_calls;
      if (text || deltas?.length) logFirstOutput();
      tool.add(deltas);
      if (text) yield text;
    }
    if (finishReason !== "stop" && finishReason !== "tool_calls")
      throw new Error("The interviewer response did not complete normally.");
    const request = tool.finish();
    if (finishReason === "tool_calls" && !request)
      throw new Error(
        "The provider marked a tool call without a valid tool request.",
      );
    if (request && finishReason !== "tool_calls")
      throw new Error(
        "The tool response ended without a tool completion marker.",
      );
    if (request) yield { type: "end_interview", request };
  }
}
