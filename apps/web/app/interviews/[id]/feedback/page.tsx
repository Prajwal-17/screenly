"use client";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Download,
  Lightbulb,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { TranscriptMessage } from "@/components/transcript";
import { Workspace } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  PageTitle,
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
  useEffect(() => {
    if (feedback) void client.invalidateQueries({ queryKey: ["interviews"] });
  }, [feedback, client]);
  return (
    <Workspace>
      {query.isPending ? (
        <Loading label="Loading feedback…" />
      ) : query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        interview && (
          <>
            <PageTitle
              title="Feedback"
              description={`${interview.role} · ${formatDate(interview.createdAt)} · ${interview.level} · ${clock(elapsed(interview))} practiced`}
              action={
                <div className="flex items-center gap-3">
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
                        className="text-destructive hover:bg-destructive-soft hover:text-destructive"
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
              <Card>
                <CardContent className="space-y-4 py-6 text-center">
                  <h3>Interview in progress</h3>
                  <p className="text-muted-foreground">
                    Return to your interview to continue or finish it.
                  </p>
                  <Button asChild>
                    <Link href={`/interviews/${id}`}>
                      Return to interview <ArrowRight />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : !feedback ? (
              <Card>
                <CardContent
                  className="space-y-4 py-6 text-center"
                  role="status"
                >
                  {interview.feedbackStatus === "failed" ? (
                    <RefreshCw className="mx-auto size-6 text-muted-foreground" />
                  ) : (
                    <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
                  )}
                  <h3>
                    {interview.feedbackStatus === "failed"
                      ? "Feedback could not be generated"
                      : "Generating feedback…"}
                  </h3>
                  <p className="text-muted-foreground">
                    {interview.feedbackStatus === "failed"
                      ? "Your transcript is saved below. Retry to generate feedback."
                      : "Your saved transcript is available below."}
                  </p>
                  {interview.feedbackStatus === "failed" && (
                    <Button
                      disabled={retry.isPending}
                      onClick={() => retry.mutate()}
                    >
                      {retry.isPending ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <RefreshCw />
                      )}
                      Retry feedback
                    </Button>
                  )}
                  {retry.error && (
                    <InlineAlert>{retry.error.message}</InlineAlert>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardContent className="grid items-center gap-8 md:grid-cols-[1fr_160px]">
                    <div>
                      <Badge variant="success">
                        <Check />
                        Interview complete
                      </Badge>
                      <h2 className="my-3">Summary</h2>
                      <p className="leading-relaxed text-muted-foreground">
                        {feedback.summary}
                      </p>
                    </div>
                    <div className="flex min-h-28 flex-col items-center justify-center gap-1 border-t pt-6 text-center tabular-nums md:border-t-0 md:border-l md:pt-0">
                      <strong className="font-heading text-6xl leading-none font-medium tracking-tight">
                        {feedback.overallScore ?? "—"}
                      </strong>
                      <span className="mt-2 text-[11px] text-muted-foreground">
                        {feedback.overallScore === null
                          ? "More evidence needed"
                          : "Overall · out of 10"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <div className="grid items-start gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <h2>Score breakdown</h2>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {feedback.dimensions.map((d) => (
                        <div key={d.name} className="space-y-2.5">
                          <div className="flex items-center justify-between gap-4 text-[13px]">
                            <span>{d.name}</span>
                            <span className="text-primary tabular-nums">
                              {d.score === null
                                ? "Insufficient evidence"
                                : `${d.score}/10`}
                            </span>
                          </div>
                          {d.score !== null && (
                            <Progress
                              value={d.score * 10}
                              aria-label={`${d.name} score`}
                            />
                          )}
                          <p className="text-xs text-muted-foreground">
                            {d.explanation}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <h3>What you did well</h3>
                      </CardHeader>
                      <CardContent>
                        {feedback.strengths.length ? (
                          <ul className="divide-y">
                            {feedback.strengths.map((s, i) => (
                              <li
                                key={i}
                                className="flex gap-3 py-3 first:pt-0 last:pb-0"
                              >
                                <Check className="mt-1 size-4 shrink-0 text-success" />
                                <span className="text-[13px] leading-relaxed">
                                  {s}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[13px] text-muted-foreground">
                            Not enough evidence in this session.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <h3>Improve next</h3>
                      </CardHeader>
                      <CardContent>
                        {feedback.improvements.length ? (
                          <ul className="divide-y">
                            {feedback.improvements.map((s, i) => (
                              <li
                                key={i}
                                className="flex gap-3 py-3 first:pt-0 last:pb-0"
                              >
                                <Lightbulb className="mt-1 size-4 shrink-0 text-warning" />
                                <span className="text-[13px] leading-relaxed">
                                  {s}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[13px] text-muted-foreground">
                            No specific improvements identified.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
                {feedback.answers.length > 0 && (
                  <section aria-labelledby="answer-review-title">
                    <h2 id="answer-review-title" className="mb-4 text-xl">
                      Answer review
                    </h2>
                    <Card className="gap-0 overflow-hidden py-0">
                      <Accordion type="multiple">
                        {feedback.answers.map((a, i) => (
                          <AccordionItem
                            key={a.messageId}
                            value={a.messageId}
                            className="px-6 last:border-b-0"
                          >
                            <AccordionTrigger className="py-5">
                              Answer {i + 1}
                            </AccordionTrigger>
                            <AccordionContent className="space-y-3 text-[13px]">
                              <blockquote className="border-l-2 border-primary/30 pl-4 leading-relaxed whitespace-pre-wrap text-muted-foreground">
                                {
                                  interview.messages.find(
                                    (m) => m.id === a.messageId,
                                  )?.content
                                }
                              </blockquote>
                              <p>{a.observation}</p>
                              <p className="text-muted-foreground">
                                <span className="text-primary">
                                  Next time:{" "}
                                </span>
                                {a.suggestion}
                              </p>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </Card>
                  </section>
                )}
                <Card>
                  <CardHeader>
                    <h2>Next steps</h2>
                  </CardHeader>
                  <CardContent>
                    <ol className="divide-y">
                      {feedback.nextSteps.map((step, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 py-4 first:pt-0"
                        >
                          <span className="grid size-7 shrink-0 place-items-center rounded-full border text-xs text-muted-foreground">
                            {i + 1}
                          </span>
                          <span className="text-[13px] leading-relaxed">
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>
                    <Button asChild className="mt-5">
                      <Link
                        href={`/interviews/new?role=${encodeURIComponent(interview.role)}`}
                      >
                        <Plus />
                        Practice again
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
            <Card className="mt-6 gap-0 overflow-hidden py-0">
              <Accordion type="single" collapsible>
                <AccordionItem value="transcript" className="border-0 px-6">
                  <AccordionTrigger className="py-6">
                    Full conversation · {interview.messages.length} turns
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6">
                      {interview.messages.length ? (
                        interview.messages.map((m) => (
                          <TranscriptMessage key={m.id} message={m} />
                        ))
                      ) : (
                        <p className="text-muted-foreground">
                          No answers were recorded in this session.
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
            {remove.error && (
              <InlineAlert className="mt-5">{remove.error.message}</InlineAlert>
            )}
          </>
        )
      )}
    </Workspace>
  );
}
