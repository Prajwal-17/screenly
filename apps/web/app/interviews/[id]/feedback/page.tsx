"use client";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Lightbulb,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Workspace } from "@/components/workspace";
import { Loading, ErrorState, Reveal } from "@/components/common";
import { api, formatDate, elapsed, clock } from "@/lib/api";
import { exportTranscript } from "@/lib/export";
import { authClient } from "@/lib/auth-client";
export default function Report() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const dialog = useRef<HTMLDialogElement>(null);
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
        <Loading label="Opening your reflection…" />
      ) : query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        interview && (
          <Reveal>
            <Link
              href="/history"
              className="text-link"
              style={{ marginBottom: 22 }}
            >
              <ArrowLeft size={14} />
              Your interview history
            </Link>
            <div className="page-title">
              <div>
                <div className="eyebrow">A moment to reflect</div>
                <h1>{interview.role} interview</h1>
                <p>
                  {formatDate(interview.createdAt)} · {interview.level} ·{" "}
                  {clock(elapsed(interview))} practiced
                </p>
              </div>
              <div className="row">
                <button
                  className="button ghost"
                  onClick={() => exportTranscript(interview)}
                >
                  <Download size={15} />
                  Transcript
                </button>
                <button
                  className="icon-button"
                  aria-label="Delete interview"
                  onClick={() => dialog.current?.showModal()}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {interview.status !== "completed" ? (
              <div className="surface empty">
                <h3>This conversation is still open.</h3>
                <p style={{ marginTop: 12 }}>
                  Return to your interview to continue or finish it.
                </p>
                <Link href={`/interviews/${id}`} className="button">
                  Return to interview <ArrowRight size={15} />
                </Link>
              </div>
            ) : !feedback ? (
              <div className="surface empty">
                <div className="empty-icon">
                  {interview.feedbackStatus === "failed" ? (
                    <RefreshCw size={23} />
                  ) : (
                    <Loader2 size={23} className="spin" />
                  )}
                </div>
                <h3>
                  {interview.feedbackStatus === "failed"
                    ? "Your conversation is safe. Let’s try the report again."
                    : "Turning your conversation into clarity."}
                </h3>
                <p style={{ marginTop: 12 }}>
                  {interview.feedbackStatus === "failed"
                    ? "Feedback couldn’t be generated. Check the LLM configuration and retry; your saved answers are below."
                    : "Your interviewer is reviewing your answers and looking for useful next steps. This can take a little time."}
                </p>
                {interview.feedbackStatus === "failed" && (
                  <button
                    className="button"
                    disabled={retry.isPending}
                    onClick={() => retry.mutate()}
                  >
                    {retry.isPending ? (
                      <Loader2 size={15} className="spin" />
                    ) : (
                      <RefreshCw size={15} />
                    )}
                    Retry feedback
                  </button>
                )}
                {retry.error && (
                  <div className="error" role="alert" style={{ marginTop: 16 }}>
                    {retry.error.message}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="surface report-hero">
                  <div>
                    <span className="tag green">
                      <Check size={12} />
                      Interview complete
                    </span>
                    <h2>
                      Here’s where you stand.
                      <br />
                      And where you can go.
                    </h2>
                    <p>{feedback.summary}</p>
                  </div>
                  <div className="score-ring">
                    <strong>{feedback.overallScore ?? "—"}</strong>
                    <span>
                      {feedback.overallScore === null
                        ? "More evidence needed"
                        : "Overall · out of 100"}
                    </span>
                  </div>
                </div>
                <div className="grid-2" style={{ marginTop: 22 }}>
                  <section className="surface pad">
                    <div className="eyebrow" style={{ marginBottom: 12 }}>
                      The details behind the score
                    </div>
                    <h2>Your interview dimensions</h2>
                    {feedback.dimensions.map((d) => (
                      <div className="dimension" key={d.name}>
                        <div className="between">
                          <span>{d.name}</span>
                          <span className="accent">
                            {d.score === null
                              ? "Insufficient evidence"
                              : `${d.score}/100`}
                          </span>
                        </div>
                        <div className="score-track">
                          <span style={{ width: `${d.score ?? 0}%` }} />
                        </div>
                        <p>{d.explanation}</p>
                      </div>
                    ))}
                  </section>
                  <div className="stack">
                    <section className="surface pad">
                      <h3>What you did well</h3>
                      {feedback.strengths.length ? (
                        feedback.strengths.map((s, i) => (
                          <div className="insight" key={i}>
                            <Check size={15} />
                            <span>{s}</span>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: 13, marginTop: 15 }}>
                          There isn’t enough evidence yet. Another conversation
                          will give us more to work with.
                        </p>
                      )}
                    </section>
                    <section className="surface pad">
                      <h3>Room to grow</h3>
                      {feedback.improvements.length ? (
                        feedback.improvements.map((s, i) => (
                          <div className="insight" key={i}>
                            <Lightbulb size={15} />
                            <span>{s}</span>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: 13, marginTop: 15 }}>
                          Keep practicing to explore your understanding more
                          deeply.
                        </p>
                      )}
                    </section>
                  </div>
                </div>
                {feedback.answers.length > 0 && (
                  <section style={{ marginTop: 30 }}>
                    <h2 style={{ fontSize: 21, marginBottom: 18 }}>
                      A closer look at your answers
                    </h2>
                    <div className="surface">
                      {feedback.answers.map((a, i) => {
                        const message = interview.messages.find(
                          (m) => m.id === a.messageId,
                        );
                        return (
                          <div className="answer-review" key={a.messageId}>
                            <div className="eyebrow accent">Answer {i + 1}</div>
                            <blockquote>{message?.content}</blockquote>
                            <p>{a.observation}</p>
                            <p>
                              <span style={{ color: "var(--accent)" }}>
                                Next time:{" "}
                              </span>
                              {a.suggestion}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
                <section className="surface pad" style={{ marginTop: 22 }}>
                  <div className="eyebrow accent" style={{ marginBottom: 12 }}>
                    Make the next conversation count
                  </div>
                  <h2 style={{ marginBottom: 15 }}>Three steps forward.</h2>
                  {feedback.nextSteps.map((s, i) => (
                    <div className="insight" key={i}>
                      <span className="step-number">{i + 1}</span>
                      <span>{s}</span>
                    </div>
                  ))}
                  <div
                    className="between"
                    style={{ marginTop: 22, flexWrap: "wrap" }}
                  >
                    <p style={{ fontSize: 12 }}>
                      Keep your focus. Keep your momentum.
                    </p>
                    <Link className="button" href="/interviews/new">
                      <Plus size={16} />
                      Practice again
                    </Link>
                  </div>
                </section>
              </>
            )}
            <details className="surface pad" style={{ marginTop: 24 }}>
              <summary style={{ cursor: "pointer", fontSize: 15 }}>
                Full conversation · {interview.messages.length} turns
              </summary>
              <div className="stack" style={{ marginTop: 24 }}>
                {interview.messages.length ? (
                  interview.messages.map((m) => (
                    <div
                      className={`transcript-message ${m.role === "user" ? "candidate" : ""}`}
                      key={m.id}
                    >
                      <div
                        className={`eyebrow ${m.role === "assistant" ? "accent" : ""}`}
                      >
                        {m.role === "assistant" ? "Forma" : "You"}
                        {m.status === "interrupted" ? " · interrupted" : ""}
                      </div>
                      <p>{m.content}</p>
                    </div>
                  ))
                ) : (
                  <p>No answers were recorded in this session.</p>
                )}
              </div>
            </details>
            {feedback && (
              <p
                style={{ fontSize: 11, marginTop: 20, color: "var(--subtle)" }}
              >
                Practice feedback · Rubric v1 · {interview.feedbackModel}
              </p>
            )}
            {remove.error && (
              <div className="error" role="alert" style={{ marginTop: 20 }}>
                {remove.error.message}
              </div>
            )}
            <dialog ref={dialog}>
              <h2>Delete this interview?</h2>
              <p>
                This removes the saved conversation and feedback from your
                history.
              </p>
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button
                  className="button ghost"
                  onClick={() => dialog.current?.close()}
                >
                  Keep it
                </button>
                <button
                  className="button danger"
                  disabled={remove.isPending}
                  onClick={() => {
                    dialog.current?.close();
                    remove.mutate();
                  }}
                >
                  Delete interview
                </button>
              </div>
            </dialog>
          </Reveal>
        )
      )}
    </Workspace>
  );
}
