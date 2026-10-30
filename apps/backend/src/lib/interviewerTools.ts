import {
  endInterviewSchema,
  interviewObservationSchema,
  type EndInterviewRequest,
  type InterviewObservation,
} from "@repo/shared";

type ToolDelta = {
  index: number;
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
};
type Pending = { id?: string; type?: string; name?: string; arguments: string };
export type ReplyPart =
  | string
  | { type: "end_interview"; request: EndInterviewRequest }
  | { type: "record_interview_observation"; observation: InterviewObservation };

/** Chat Completions stream tool deltas may split the name and JSON arguments. */
export class EndToolStream {
  private calls = new Map<number, Pending>();
  add(deltas: ToolDelta[] | null | undefined) {
    for (const delta of deltas ?? []) {
      if (
        !Number.isSafeInteger(delta.index) ||
        delta.index < 0 ||
        delta.index > 8
      )
        throw new Error("Invalid tool stream index.");
      const call = this.calls.get(delta.index) ?? { arguments: "" };
      if (delta.id) {
        if (call.id && call.id !== delta.id)
          throw new Error("Tool identity changed during stream.");
        call.id = delta.id;
      }
      if (delta.type) {
        if (call.type && call.type !== delta.type)
          throw new Error("Tool type changed during stream.");
        call.type = delta.type;
      }
      if (delta.function?.name) {
        if (call.name && call.name !== delta.function.name)
          throw new Error("Tool name changed during stream.");
        call.name = delta.function.name;
      }
      call.arguments += delta.function?.arguments ?? "";
      if (call.arguments.length > 8192)
        throw new Error("Tool arguments are too large.");
      this.calls.set(delta.index, call);
    }
  }
  finish(): {
    end: EndInterviewRequest | null;
    observation: InterviewObservation | null;
  } {
    if (this.calls.size > 2)
      throw new Error("Too many interviewer tool calls.");
    let end: EndInterviewRequest | null = null;
    let observation: InterviewObservation | null = null;
    for (const call of this.calls.values()) {
      if (call.type !== "function" || !call.id)
        throw new Error("Unknown or malformed tool call.");
      let raw: unknown;
      try {
        raw = JSON.parse(call.arguments);
      } catch {
        throw new Error("Malformed interviewer tool arguments.");
      }
      if (call.name === "end_interview" && !end)
        end = endInterviewSchema.parse(raw);
      else if (call.name === "record_interview_observation" && !observation)
        observation = interviewObservationSchema.parse(raw);
      else throw new Error("Duplicate or unknown interviewer tool call.");
    }
    return { end, observation };
  }
}

export const observationTool = {
  type: "function" as const,
  function: {
    name: "record_interview_observation",
    description:
      "Propose bounded conversational state from current transcript sources. Include exact excerpts of any explicit help or changed constraint in this same spoken reply; null otherwise. No score or verdict.",
    parameters: {
      type: "object",
      properties: {
        objective: { type: "string" },
        situation: { type: "string" },
        constraints: { type: "array", items: { type: "string" } },
        unresolvedPoints: { type: "array", items: { type: "string" } },
        sourceMessageIds: { type: "array", items: { type: "string" } },
        objectiveEvidence: {
          type: "array",
          items: {
            type: "object",
            properties: {
              objective: { type: "string" },
              messageIds: { type: "array", items: { type: "string" } },
            },
            required: ["objective", "messageIds"],
            additionalProperties: false,
          },
        },
        hint: { type: ["string", "null"] },
        constraintChange: { type: ["string", "null"] },
      },
      required: [
        "objective",
        "situation",
        "constraints",
        "unresolvedPoints",
        "sourceMessageIds",
        "objectiveEvidence",
        "hint",
        "constraintChange",
      ],
      additionalProperties: false,
    },
  },
};

export const endInterviewTool = {
  type: "function" as const,
  function: {
    name: "end_interview",
    description:
      "Request server-controlled graceful ending only after sufficient exploration, an explicit candidate stop, or the server deadline. No session or user IDs are accepted.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          enum: [
            "coverage_complete",
            "candidate_requested_stop",
            "time_reached",
          ],
        },
      },
      required: ["reason"],
      additionalProperties: false,
    },
  },
};
