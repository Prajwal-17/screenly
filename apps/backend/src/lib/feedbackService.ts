import type { InterviewStore } from "../db/interviews";
import type { Config } from "../config";
import type { SessionReview } from "@repo/shared";
import { ReviewService } from "./reviewService";

async function deriveMemory(
  id: string,
  store: InterviewStore,
  review: SessionReview,
) {
  if (!(await store.pendingMemory(id))) return;
  try {
    if (await store.deriveMemory(id, review))
      await store.memoryState(id, review, "ready");
  } catch {
    // Review remains ready. A later explicit queue invocation retries only
    // this deterministic DB step, without another paid model call.
    await store.memoryState(id, review, "failed").catch(() => {});
    console.error(
      JSON.stringify({ event: "review_memory_failed", interviewId: id }),
    );
  }
}

export async function generateFeedback(
  id: string,
  store: InterviewStore,
  env: Config,
) {
  const interview = await store.get(id);
  if (!interview || interview.status !== "completed") return;
  if (interview.review) {
    await deriveMemory(id, store, interview.review);
    return;
  }
  if (interview.feedbackStatus === "skipped") return;
  const claim = await store.claimReview(id);
  if (!claim) return;
  const startedAt = performance.now();
  let outcome = "failed";
  console.info(JSON.stringify({ event: "review_started", interviewId: id }));
  try {
    const fresh = await store.get(id);
    if (!fresh || fresh.status !== "completed") return;
    const report = await new ReviewService(env).generate(fresh);
    if (await store.commitReview(id, claim, report, env.LLM_MODEL!)) {
      outcome = "ready";
      await deriveMemory(id, store, report);
    } else {
      outcome = "stale";
      await store.failReview(id, claim);
    }
  } catch (error) {
    // Never log provider output, transcript, profile text or untrusted errors.
    console.error(
      JSON.stringify({
        event: "review_failed",
        interviewId: id,
        code:
          error instanceof Error &&
          "code" in error &&
          /^[A-Z0-9_]{1,60}$/.test(String(error.code))
            ? String(error.code)
            : "PROVIDER_OR_VALIDATION",
      }),
    );
    await store.failReview(id, claim);
  } finally {
    console.info(
      JSON.stringify({
        event: "review_finished",
        interviewId: id,
        outcome,
        elapsedMs: Math.round(performance.now() - startedAt),
      }),
    );
  }
}
