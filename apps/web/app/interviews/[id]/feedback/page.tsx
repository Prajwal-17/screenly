"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, Trash2, RefreshCw } from "lucide-react";
import { TranscriptMessage } from "@/components/transcript";
import { Workspace } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loading,
  ErrorState,
  RefreshNotice,
  InlineAlert,
  ConfirmAction,
  PageIntro,
} from "@/components/common";
import { ApiError, api, formatDate, elapsed, clock } from "@/lib/api";
import { exportTranscript } from "@/lib/export";
import { authClient } from "@/lib/auth-client";
import { FeaturePreview } from "@/components/feature-preview";

export default function SessionReport() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const { data: auth } = authClient.useSession();
  const query = useQuery({
    queryKey: ["interview", id],
    queryFn: () => api.detail(id),
    enabled: !!auth,
    refetchOnMount: "always",
    refetchInterval: (query) =>
      query.state.data?.status === "completed" &&
      ["pending", "generating"].includes(query.state.data.feedbackStatus)
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
  useEffect(() => {
    if (interview?.review || interview?.feedback)
      void client.invalidateQueries({ queryKey: ["interviews"] });
  }, [interview?.review, interview?.feedback, client]);
  return (
    <Workspace title="Interview review">
      {!query.data &&
      !(
        query.isError ||
        query.errorUpdatedAt > 0 ||
        query.fetchStatus === "paused"
      ) ? (
        <Loading label="Loading your interview review…" layout="review" />
      ) : !query.data ? (
        <ErrorState
          title={
            query.error instanceof ApiError && query.error.status === 404
              ? "Interview not found"
              : "We couldn’t load this interview"
          }
          message={
            query.error instanceof ApiError && query.error.status === 404
              ? "Interview not found."
              : query.fetchStatus === "paused"
                ? "You’re offline. Reconnect, then try again."
                : "Your saved conversation hasn’t changed. Try opening it again."
          }
          retry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        interview && (
          <>
            {(query.isError || query.fetchStatus === "paused") && (
              <RefreshNotice
                message={
                  query.fetchStatus === "paused"
                    ? "You’re offline. Showing the last loaded version."
                    : "This section couldn’t refresh. Showing the last loaded version."
                }
                retry={() => void query.refetch()}
                retrying={query.isFetching}
              />
            )}
            <PageIntro
              description={`${interview.role} · ${interview.level} · ${formatDate(interview.createdAt)} · ${clock(elapsed(interview))} practiced`}
              action={
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => exportTranscript(interview)}
                  >
                    <Download /> Transcript
                  </Button>
                  <ConfirmAction
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete interview"
                        disabled={remove.isPending}
                      >
                        <Trash2 />
                      </Button>
                    }
                    title="Delete interview?"
                    description="This removes the session, its conversation, and review from your history. This cannot be undone."
                    confirmLabel="Delete interview"
                    destructive
                    pending={remove.isPending}
                    onConfirm={() => remove.mutate()}
                  />
                </div>
              }
            />
            {interview.review?.schemaVersion === 2 ? (
              <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
                <section
                  aria-labelledby="review-title"
                  className="border-b pb-7 xl:col-start-1"
                >
                  <h2 id="review-title" className="mb-3 type-section-title">
                    Session review
                  </h2>
                  <p className="max-w-[70ch] type-prose">
                    {interview.review.summary}
                  </p>
                </section>
                {interview.review.findings.length > 0 && (
                  <section
                    aria-labelledby="findings-title"
                    className="xl:col-start-1"
                  >
                    <h2 id="findings-title" className="mb-4 type-section-title">
                      Findings
                    </h2>
                    <div className="divide-y border-y">
                      {interview.review.findings.map((finding) => (
                        <article key={finding.id} className="py-5">
                          <div className="mb-3 flex flex-wrap items-center gap-3">
                            <h3 className="type-subsection-title">
                              {finding.dimension
                                .replaceAll("-", " ")
                                .replace(/^./, (letter) =>
                                  letter.toUpperCase(),
                                )}
                            </h3>
                            <Badge
                              variant={
                                finding.label === "Demonstrated"
                                  ? "success"
                                  : finding.label === "Partially demonstrated"
                                    ? "warning"
                                    : finding.label === "Needs work"
                                      ? "destructive"
                                      : "secondary"
                              }
                            >
                              {finding.label}
                            </Badge>
                          </div>
                          <p className="max-w-[70ch] type-prose">
                            {finding.observation}
                          </p>
                          <p className="mt-3 max-w-[70ch] type-prose text-muted-foreground">
                            {finding.improvement}
                          </p>
                          {finding.evidence.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {finding.evidence.map((source, index) => {
                                const message = interview.messages.find(
                                  (item) =>
                                    item.id === source.messageId &&
                                    item.content.includes(source.quote),
                                );
                                return message ? (
                                  <a
                                    key={`${source.messageId}-${index}`}
                                    href={`#message-${message.id}`}
                                    className="rounded-md border px-3 py-2 text-xs underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                                  >
                                    View evidence {index + 1}: “
                                    {source.quote.length > 100
                                      ? `${source.quote.slice(0, 100)}…`
                                      : source.quote}
                                    ”
                                  </a>
                                ) : null;
                              })}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                )}
                <section
                  aria-labelledby="priority-title"
                  className="rounded-xl bg-accent p-6 text-accent-foreground xl:sticky xl:top-20 xl:col-start-2 xl:row-start-1 xl:row-span-3"
                >
                  <h2 id="priority-title" className="mb-2 type-section-title">
                    Next practice
                  </h2>
                  <h3 className="type-subsection-title">
                    {interview.review.practicePriority.title}
                  </h3>
                  <p className="mt-3 max-w-[70ch] type-ui leading-relaxed">
                    {interview.review.practicePriority.action}
                  </p>
                  <p className="mt-3 max-w-[70ch] type-ui leading-relaxed">
                    A stronger explanation would show:{" "}
                    {interview.review.practicePriority.strongerExplanation}
                  </p>
                  <Button asChild size="sm" className="mt-5">
                    <Link
                      href={`/interviews/new?role=${encodeURIComponent(interview.role)}`}
                    >
                      <Plus /> Practice again
                    </Link>
                  </Button>
                </section>
                {(interview.review.notAssessed.length > 0 ||
                  interview.review.limitations.length > 0) && (
                  <section
                    className="max-w-[70ch] space-y-3 text-sm text-muted-foreground xl:col-start-1"
                    aria-label="Review limits"
                  >
                    {interview.review.notAssessed.length > 0 && (
                      <p>
                        Not assessed: {interview.review.notAssessed.join("; ")}
                      </p>
                    )}
                    {interview.review.limitations.map((item, index) => (
                      <p key={index}>{item}</p>
                    ))}
                  </section>
                )}
              </div>
            ) : interview.feedback ? (
              <section className="border-y py-7">
                <h2 className="mb-3 type-section-title">Earlier review</h2>
                <p className="max-w-[70ch] type-prose">
                  {interview.feedback.summary}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  This earlier summary has no evidence-linked assessment labels.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  loading={
                    retry.isPending ||
                    ["pending", "generating"].includes(interview.feedbackStatus)
                  }
                  onClick={() => retry.mutate()}
                >
                  <RefreshCw /> Request a new review
                </Button>
              </section>
            ) : (
              <section className="border-y py-7">
                <h2 className="type-section-title">
                  {interview.feedbackStatus === "generating" ||
                  interview.feedbackStatus === "pending"
                    ? "Review in progress"
                    : interview.feedbackStatus === "failed" ||
                        interview.feedbackStatus === "ready"
                      ? "Review unavailable"
                      : "Conversation saved"}
                </h2>
                <p
                  role={
                    ["pending", "generating"].includes(interview.feedbackStatus)
                      ? "status"
                      : undefined
                  }
                  className="mt-2 text-sm text-muted-foreground"
                >
                  {interview.feedbackStatus === "generating" ||
                  interview.feedbackStatus === "pending"
                    ? "Your transcript is available below while the review is prepared."
                    : interview.feedbackStatus === "failed" ||
                        interview.feedbackStatus === "ready"
                      ? "Your transcript is saved. Retry the review when ready."
                      : "Your transcript is saved. You can request a review later."}
                </p>
                {["failed", "skipped", "ready"].includes(
                  interview.feedbackStatus,
                ) && (
                  <Button
                    className="mt-5"
                    loading={retry.isPending}
                    loadingLabel="Requesting review…"
                    aria-label={
                      interview.feedbackStatus === "failed" ||
                      interview.feedbackStatus === "ready"
                        ? "Retry review"
                        : "Generate review"
                    }
                    onClick={() => retry.mutate()}
                  >
                    <RefreshCw />{" "}
                    {interview.feedbackStatus === "failed" ||
                    interview.feedbackStatus === "ready"
                      ? "Retry review"
                      : "Generate review"}
                  </Button>
                )}
                {retry.error && (
                  <InlineAlert className="mt-4">
                    {retry.error.message}
                  </InlineAlert>
                )}
              </section>
            )}
            <div className="mt-6 flex justify-end">
              <FeaturePreview feature="plan" />
            </div>
            <section
              className="mt-6 border-t pt-6"
              aria-labelledby="transcript-title"
            >
              <h2 id="transcript-title" className="mb-6 type-section-title">
                Transcript
              </h2>
              <div className="mx-auto max-w-3xl space-y-6">
                {interview.messages.length ? (
                  interview.messages.map((message) => (
                    <TranscriptMessage key={message.id} message={message} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No conversation was recorded in this session.
                  </p>
                )}
              </div>
            </section>
            {remove.error && (
              <InlineAlert className="mt-5">{remove.error.message}</InlineAlert>
            )}
          </>
        )
      )}
    </Workspace>
  );
}
