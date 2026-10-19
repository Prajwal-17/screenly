import type { InterviewStore } from "../db/interviews";
import type { Config } from "../config";
import { LLMService } from "./llmService";
export async function generateFeedback(
  id: string,
  store: InterviewStore,
  env: Config,
) {
  const interview = await store.get(id);
  if (
    !interview ||
    interview.status !== "completed" ||
    interview.feedbackStatus === "ready" ||
    interview.feedbackStatus === "skipped"
  )
    return;
  await store.feedbackState(id, "generating");
  try {
    const report = await new LLMService(env).evaluate(interview);
    await store.saveFeedback(id, report, env.LLM_MODEL!);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "feedback_failed",
        interviewId: id,
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    );
    await store.feedbackState(id, "failed");
  }
}
