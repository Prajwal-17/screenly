import OpenAI from "openai";
import {
  feedbackSchema,
  type InterviewDetail,
  type InterviewMessage,
} from "@repo/shared";
import type { Config } from "../config";
import { feedbackPrompt, interviewPrompt } from "../constants";

export function parseFeedback(raw: string, messages: InterviewMessage[]) {
  const feedback = feedbackSchema.parse(
    JSON.parse(
      raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, ""),
    ),
  );
  const candidateIds = new Set(
    messages.filter((m) => m.role === "user").map((m) => m.id),
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
  async *generateReply(
    interview: InterviewDetail,
    signal: AbortSignal,
  ): AsyncGenerator<string> {
    const remaining =
      interview.duration -
      (Date.now() - (interview.startedAt ?? Date.now())) / 60000;
    const stream = await this.client.chat.completions.create(
      {
        model: this.env.LLM_MODEL!,
        messages: [
          {
            role: "system",
            content: interviewPrompt(interview, Math.ceil(remaining)),
          },
          ...interview.messages.map((message) => ({
            role: message.role,
            content:
              message.content +
              (message.status === "interrupted"
                ? " [This reply was interrupted.]"
                : ""),
          })),
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
            transcript: interview.messages,
          }),
        },
      ],
    });
    const raw = result.choices[0]?.message.content ?? "";
    return parseFeedback(raw, interview.messages);
  }
}
