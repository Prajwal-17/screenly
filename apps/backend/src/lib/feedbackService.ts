import { interviews } from "../db/interviews";
import { env } from "../config";
import { LLMService } from "./llmService";
const pending = new Map<string, Promise<void>>();
export function generateFeedback(id: string): Promise<void> {
  const current = pending.get(id);
  if (current) return current;
  const interview = interviews.get(id);
  if (
    !interview ||
    interview.status !== "completed" ||
    interview.feedbackStatus === "ready"
  )
    return Promise.resolve();
  const task = (async () => {
    interviews.feedbackState(id, "generating");
    try {
      const report = await new LLMService().evaluate(interview);
      interviews.saveFeedback(id, report, env.LLM_MODEL!);
    } catch (error) {
      console.error(
        "[Feedback] Generation failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      interviews.feedbackState(id, "failed");
    }
  })().finally(() => pending.delete(id));
  pending.set(id, task);
  return task;
}
