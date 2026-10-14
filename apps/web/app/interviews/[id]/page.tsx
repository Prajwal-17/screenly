"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Mic,
  MicOff,
  Square,
  Loader2,
  RefreshCw,
  VolumeX,
  Volume2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { Workspace } from "@/components/workspace";
import { Loading, ErrorState, Wave } from "@/components/common";
import { Preflight } from "@/components/preflight";
import { Session } from "@/lib/interview-session";
import { useInterviewStore } from "@/store/interviewStore";
import { api, clock, elapsed } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: auth } = authClient.useSession();
  const authId = auth?.session.id;
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["interview", id],
    queryFn: () => api.detail(id),
    enabled: !!auth,
  });
  const capabilities = useQuery({
    queryKey: ["capabilities"],
    queryFn: api.capabilities,
  });
  const controller = useRef<Session | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const state = useInterviewStore();
  const [now, setNow] = useState(() => Date.now());
  const finish = useMutation({
    mutationFn: () => api.finish(id),
    onSuccess: (data) => {
      client.setQueryData(["interview", id], data);
      void client.invalidateQueries({ queryKey: ["interviews"] });
      router.push(`/interviews/${id}/feedback`);
    },
  });
  useEffect(() => {
    if (!authId) return;
    const session = new Session(id, (done) => {
      void client.invalidateQueries({ queryKey: ["interviews"] });
      void client.invalidateQueries({ queryKey: ["interview", done] });
      router.push(`/interviews/${done}/feedback`);
    });
    controller.current = session;
    session.connect();
    return () => {
      session.close();
      controller.current = null;
    };
  }, [id, authId, router, client]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const element = transcript.current;
    if (
      element &&
      element.scrollHeight - element.scrollTop - element.clientHeight < 160
    )
      element.scrollTop = element.scrollHeight;
  }, [state.messages, state.streaming, state.partial]);
  const interview = state.interview?.id === id ? state.interview : query.data;
  const started = ["listening", "thinking", "speaking", "finishing"].includes(
    state.status,
  );
  const lastQuestion =
    state.streaming ||
    state.messages.filter((m) => m.role === "assistant").at(-1)?.content;
  const statusLabels = {
    connecting: "Connecting",
    ready: "Ready when you are",
    listening: state.muted
      ? "Microphone muted"
      : state.micActive
        ? "Listening to you"
        : "Your turn",
    thinking: "Thinking about your answer",
    speaking: "Your interviewer is speaking",
    finishing: "Saving your conversation",
    disconnected: "Connection paused",
  };
  return (
    <Workspace>
      {query.isPending ? (
        <Loading label="Preparing your conversation…" />
      ) : query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        interview && (
          <>
            <Link
              href="/dashboard"
              className="text-link"
              style={{ marginBottom: 22 }}
            >
              <ArrowLeft size={14} />
              Back to workspace
            </Link>
            <div className="page-title">
              <div>
                <div className="eyebrow">Your space to think out loud</div>
                <h1>{interview.role} interview</h1>
                <p>
                  {interview.level} · {interview.topics.join(" · ")}
                </p>
              </div>
              <span
                className="tag green"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  padding: "9px 13px",
                }}
              >
                {clock(elapsed(interview, now))} / {interview.duration}:00
              </span>
            </div>
            {(state.error || finish.error) && (
              <div className="error" role="alert" style={{ marginBottom: 20 }}>
                {state.error || finish.error?.message}
                <div style={{ marginTop: 10 }}>
                  {state.connected ? (
                    <button
                      className="text-link"
                      style={{
                        background: "transparent",
                        border: 0,
                        padding: 0,
                      }}
                      onClick={() =>
                        state.errorScope === "speech"
                          ? void controller.current?.speakLatest()
                          : void controller.current?.start()
                      }
                    >
                      {state.errorScope === "speech"
                        ? "Retry speech"
                        : state.errorScope === "voice"
                          ? "Retry microphone"
                          : "Retry interviewer"}
                    </button>
                  ) : (
                    <button
                      className="text-link"
                      style={{
                        background: "transparent",
                        border: 0,
                        padding: 0,
                      }}
                      onClick={() => controller.current?.connect()}
                    >
                      <RefreshCw size={13} />
                      Reconnect
                    </button>
                  )}
                </div>
              </div>
            )}
            {capabilities.error && (
              <div className="error" role="alert" style={{ marginBottom: 20 }}>
                Could not check service availability.{" "}
                <button
                  className="text-link"
                  style={{ border: 0, background: "transparent" }}
                  onClick={() => void capabilities.refetch()}
                >
                  Try again
                </button>
              </div>
            )}
            {!started ? (
              <>
                <Preflight
                  interview={interview}
                  capabilities={capabilities.data}
                  disabled={!state.connected}
                  starting={state.starting}
                  onStart={(download) =>
                    void controller.current?.start(download)
                  }
                />
                {state.status === "disconnected" && !state.error && (
                  <div className="notice" style={{ marginTop: 18 }}>
                    Your conversation is saved.{" "}
                    <button
                      className="text-link"
                      style={{ background: "transparent", border: 0 }}
                      onClick={() => controller.current?.connect()}
                    >
                      Reconnect to resume
                    </button>
                  </div>
                )}
                {interview.status === "active" && (
                  <button
                    className="button ghost"
                    style={{ marginTop: 18 }}
                    onClick={() => dialog.current?.showModal()}
                  >
                    Finish saved interview
                  </button>
                )}
              </>
            ) : (
              <div className="session-grid">
                <div className="stack">
                  <div className="surface">
                    <div className="interview-stage">
                      <div className="stage-label">
                        <span className="eyebrow">Forma interviewer</span>
                        <span className="tag">Technical practice</span>
                      </div>
                      <div className="voice-orb">
                        <Wave
                          active={
                            state.status === "thinking" ||
                            state.status === "speaking" ||
                            (state.status === "listening" && state.level > 0.03)
                          }
                        />
                      </div>
                      <p className="stage-question">
                        {lastQuestion || "Let’s find your starting point."}
                      </p>
                      <div className="stage-status" role="status">
                        {state.status === "thinking" ? (
                          <Loader2 size={13} className="spin" />
                        ) : (
                          <span className="dot" />
                        )}
                        {statusLabels[state.status]}
                      </div>
                    </div>
                    <div className="session-controls">
                      <button
                        className="button secondary"
                        disabled={
                          !lastQuestion ||
                          !state.connected ||
                          !capabilities.data?.voice ||
                          state.status === "thinking" ||
                          state.status === "finishing"
                        }
                        onClick={() => void controller.current?.speakLatest()}
                      >
                        <Volume2 size={16} />
                        Hear question
                      </button>
                      {state.micActive && (
                        <button
                          className="button secondary"
                          onClick={() => controller.current?.mute()}
                          aria-pressed={state.muted}
                        >
                          {state.muted ? (
                            <MicOff size={16} />
                          ) : (
                            <Mic size={16} />
                          )}{" "}
                          {state.muted ? "Unmute" : "Mute"}
                        </button>
                      )}
                      <button
                        className="button ghost"
                        disabled={
                          state.status !== "speaking" &&
                          state.status !== "thinking"
                        }
                        onClick={() => controller.current?.interrupt()}
                      >
                        <VolumeX size={16} />
                        Interrupt
                      </button>
                      <button
                        className="button danger"
                        disabled={finish.isPending}
                        onClick={() => dialog.current?.showModal()}
                      >
                        <Square size={14} />
                        Finish interview
                      </button>
                    </div>
                  </div>
                  <div className="surface pad">
                    <div className="between">
                      <span className="eyebrow">Your answer</span>
                      <span style={{ fontSize: 11, color: "var(--subtle)" }}>
                        {state.micActive
                          ? "Speak naturally. Take your time."
                          : "Retry your microphone to continue."}
                      </span>
                    </div>
                    {state.micActive && (
                      <div className="meter">
                        <span style={{ width: `${state.level * 100}%` }} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="surface transcript-panel">
                  <div className="between">
                    <span className="eyebrow">Conversation</span>
                    <span className="tag">{state.messages.length} turns</span>
                  </div>
                  <div
                    className="transcript-list"
                    ref={transcript}
                    aria-live="polite"
                    aria-relevant="additions"
                  >
                    {state.messages.length === 0 && !state.streaming && (
                      <p style={{ fontSize: 13 }}>
                        Your conversation will appear here as it unfolds.
                      </p>
                    )}
                    {state.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`transcript-message ${m.role === "user" ? "candidate" : ""}`}
                      >
                        <div
                          className={`eyebrow ${m.role === "assistant" ? "accent" : ""}`}
                        >
                          {m.role === "assistant" ? "Forma" : "You"}
                          {m.status === "interrupted" ? " · interrupted" : ""}
                        </div>
                        <p>{m.content}</p>
                      </div>
                    ))}
                    {state.streaming && (
                      <div className="transcript-message" aria-hidden="true">
                        <div className="eyebrow accent">Forma</div>
                        <p>{state.streaming}</p>
                      </div>
                    )}
                    {state.partial && (
                      <div
                        className="transcript-message candidate partial"
                        aria-hidden="true"
                      >
                        <div className="eyebrow">You · speaking</div>
                        <p>{state.partial}</p>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: 11, marginTop: 20 }}>
                    Finalized answers are saved to your history.
                  </p>
                </div>
              </div>
            )}
            <dialog ref={dialog}>
              <h2>Ready to reflect?</h2>
              <p>
                Finish this interview and turn your conversation into feedback.
                You’ll find the transcript and report in your history.
              </p>
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button
                  className="button ghost"
                  onClick={() => dialog.current?.close()}
                >
                  Keep going
                </button>
                <button
                  className="button"
                  disabled={finish.isPending}
                  onClick={() => {
                    dialog.current?.close();
                    finish.mutate();
                  }}
                >
                  {finish.isPending ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <Square size={13} />
                  )}
                  Finish & reflect
                </button>
              </div>
            </dialog>
          </>
        )
      )}
    </Workspace>
  );
}
