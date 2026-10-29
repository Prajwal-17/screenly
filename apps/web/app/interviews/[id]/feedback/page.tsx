"use client";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Download,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { TranscriptMessage } from "@/components/transcript";
import { Workspace } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Loading,
  ErrorState,
  InlineAlert,
  ConfirmAction,
  PageIntro,
} from "@/components/common";
import { api, formatDate, elapsed, clock } from "@/lib/api";
import { exportTranscript } from "@/lib/export";
import { authClient } from "@/lib/auth-client";
export default function Report() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const { data: auth } = authClient.useSession();
  const query = useQuery({
    queryKey: ["interview", id],
    queryFn: () => api.detail(id),
    enabled: !!auth,
    refetchOnMount: "always",
    refetchInterval: (q) =>
      q.state.data?.status === "completed" &&
      ["pending", "generating"].includes(q.state.data.feedbackStatus)
        ? 2000
        : false,
  });
  const retry = useMutation({
    mutationFn: () => api.retryFeedback(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["interview", id] }),
  });
  const remove = useMutation({
    mutationFn: () => api.remove(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["interviews"] });
      router.push("/history");
    },
  });
  const interview = query.data;
  const feedback = interview?.feedback;
  const feedbackSkipped = interview?.feedbackStatus === "skipped";
  useEffect(() => {
    if (feedback) void client.invalidateQueries({ queryKey: ["interviews"] });
  }, [feedback, client]);
  return (
    <Workspace title={feedbackSkipped ? "Saved interview" : undefined}>
      {query.isPending ? (
        <Loading label="Loading feedback…" />
      ) : query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        interview && (
          <>
            <PageIntro
              description={`${interview.role} · ${interview.level} · ${formatDate(interview.createdAt)} · ${clock(elapsed(interview))} practiced`}
              action={
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => exportTranscript(interview)}
                  >
                    <Download />
                    Transcript
                  </Button>
                  <ConfirmAction
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-destructive-surface hover:text-destructive"
                        aria-label="Delete interview"
                        disabled={remove.isPending}
                      >
                        <Trash2 />
                      </Button>
                    }
                    title="Delete interview?"
                    description="This removes the saved conversation and feedback from your history. This cannot be undone."
                    confirmLabel="Delete interview"
                    destructive
                    pending={remove.isPending}
                    onConfirm={() => remove.mutate()}
                  />
                </div>
              }
            />
            {interview.status !== "completed" ? (
              <section className="rounded-xl border bg-card p-8 text-center">
                <h2>Interview in progress</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Return to your interview to continue or finish it.
                </p>
                <Button asChild className="mt-5">
                  <Link href={`/interviews/${id}`}>
                    Return to interview
                    <ArrowRight />
                  </Link>
                </Button>
              </section>
            ) : !feedback ? (
              <section
                className="rounded-xl border bg-card p-8 text-center"
                role="status"
              >
                {feedbackSkipped ? (
                  <Check
                    className="mx-auto mb-4 size-6 text-success"
                    aria-hidden="true"
                  />
                ) : interview.feedbackStatus === "failed" ? (
                  <RefreshCw
                    className="mx-auto mb-4 size-6 text-muted-foreground"
                    aria-hidden="true"
                  />
                ) : (
                  <Loader2
                    className="mx-auto mb-4 size-6 animate-spin text-primary"
                    aria-hidden="true"
                  />
                )}
                <h2>
                  {feedbackSkipped
                    ? "Ended without feedback"
                    : interview.feedbackStatus === "failed"
                      ? "Feedback could not be generated"
                      : "Generating feedback…"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feedbackSkipped
                    ? "Your conversation is saved below. You can generate feedback later if you choose."
                    : interview.feedbackStatus === "failed"
                      ? "Your transcript is saved below. Retry to generate feedback."
                      : "Your saved transcript is available below."}
                </p>
                {(feedbackSkipped || interview.feedbackStatus === "failed") && (
                  <Button
                    className="mt-5"
                    loading={retry.isPending}
                    onClick={() => retry.mutate()}
                  >
                    <RefreshCw />
                    {feedbackSkipped ? "Generate feedback" : "Retry feedback"}
                  </Button>
                )}
                {retry.error && (
                  <InlineAlert className="mt-5 text-left">
                    {retry.error.message}
                  </InlineAlert>
                )}
              </section>
            ) : (
              <div className="space-y-7">
                <section
                  className="grid gap-6 border-y py-7 sm:grid-cols-[minmax(0,1fr)_120px]"
                  aria-labelledby="summary-title"
                >
                  <div>
                    <h2 id="summary-title" className="sr-only">
                      Feedback summary
                    </h2>
                    <p className="max-w-[65ch] text-base leading-relaxed">
                      {feedback.summary}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2 sm:block sm:text-right">
                    <strong className="text-4xl leading-none font-medium tracking-[-0.035em] tabular-nums">
                      {feedback.overallScore ?? "—"}
                    </strong>
                    {feedback.overallScore !== null && (
                      <span className="text-sm text-muted-foreground">
                        {" "}
                        / 10
                      </span>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {feedback.overallScore === null
                        ? "More evidence needed"
                        : "Overall score"}
                    </p>
                  </div>
                </section>
                <div className="grid gap-8 border-b pb-7 lg:grid-cols-2 lg:gap-12">
                  <section aria-labelledby="next-steps-title">
                    <h2 id="next-steps-title" className="text-base">
                      Next practice
                    </h2>
                    <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
                      {feedback.nextSteps.map((step, i) => (
                        <li key={i} className="pl-1">
                          {step}
                        </li>
                      ))}
                    </ol>
                    <Button asChild size="sm" className="mt-6">
                      <Link
                        href={`/interviews/new?role=${encodeURIComponent(interview.role)}`}
                      >
                        <Plus />
                        Practice again
                      </Link>
                    </Button>
                  </section>
                  <section aria-labelledby="breakdown-title">
                    <h2 id="breakdown-title" className="text-base">
                      Score breakdown
                    </h2>
                    <div className="mt-4 space-y-4">
                      {feedback.dimensions.map((d) => (
                        <div key={d.name}>
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span>{d.name}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {d.score === null
                                ? "Insufficient evidence"
                                : `${d.score}/10`}
                            </span>
                          </div>
                          {d.score !== null && (
                            <Progress
                              className="h-1 [&_[data-slot=progress-indicator]]:bg-muted-foreground"
                              value={d.score * 10}
                              aria-label={`${d.name} score`}
                            />
                          )}
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-muted-foreground">
                              Score explanation
                            </summary>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                              {d.explanation}
                            </p>
                          </details>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
                <Accordion type="multiple" className="border-b">
                  {[
                    {
                      title: "Strengths",
                      items: feedback.strengths,
                      empty: "Not enough evidence in this session.",
                    },
                    {
                      title: "Improvements",
                      items: feedback.improvements,
                      empty: "No specific improvements identified.",
                    },
                  ].map(({ title, items, empty }) => (
                    <AccordionItem key={title} value={title}>
                      <AccordionTrigger className="py-4 text-sm">
                        {title}
                      </AccordionTrigger>
                      <AccordionContent>
                        {items.length ? (
                          <ul className="list-disc space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
                            {items.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {empty}
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {feedback.answers.length > 0 && (
                  <section aria-labelledby="answer-review-title">
                    <h2 id="answer-review-title" className="mb-4">
                      Answer review
                    </h2>
                    <div className="overflow-hidden border-y">
                      <Accordion type="multiple">
                        {feedback.answers.map((a, i) => (
                          <AccordionItem
                            key={a.messageId}
                            value={a.messageId}
                            className="last:border-0"
                          >
                            <AccordionTrigger className="py-5 text-sm">
                              Answer {i + 1}
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 text-sm">
                              <blockquote className="rounded-lg bg-muted p-4 leading-relaxed whitespace-pre-wrap text-muted-foreground">
                                {
                                  interview.messages.find(
                                    (m) => m.id === a.messageId,
                                  )?.content
                                }
                              </blockquote>
                              <p className="leading-relaxed">{a.observation}</p>
                              <p className="leading-relaxed text-muted-foreground">
                                <span className="font-medium text-primary">
                                  Next time:{" "}
                                </span>
                                {a.suggestion}
                              </p>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  </section>
                )}
              </div>
            )}
            <div className="mt-7 overflow-hidden border-y">
              <Accordion type="single" collapsible>
                <AccordionItem value="transcript" className="border-0">
                  <AccordionTrigger className="py-5 text-sm">
                    Full conversation · {interview.messages.length} turns
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="mx-auto max-w-3xl space-y-6 py-3">
                      {interview.messages.length ? (
                        interview.messages.map((m) => (
                          <TranscriptMessage key={m.id} message={m} />
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No answers were recorded in this session.
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            {remove.error && (
              <InlineAlert className="mt-5">{remove.error.message}</InlineAlert>
            )}
          </>
        )
      )}
    </Workspace>
  );
}
