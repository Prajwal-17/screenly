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
} from "lucide-react";
import { Workspace } from "@/components/workspace";
import { Loading, ErrorState } from "@/components/common";
import { LiveTranscript } from "@/components/transcript";
import { AnswerComposer } from "@/components/answer-composer";
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
  const interview = state.interview?.id === id ? state.interview : query.data;
  const started = ["listening", "thinking", "speaking", "finishing"].includes(
    state.status,
  );
  const lastQuestion =
    state.streaming ||
    state.messages.filter((m) => m.role === "assistant").at(-1)?.content;
  const statusLabels = {
    connecting: "Connecting",
    ready: "Ready",
    listening: state.typed
      ? "Your turn"
      : state.muted
        ? "Microphone muted"
        : state.micActive
          ? "Listening to you"
          : "Your turn",
    thinking: "Processing answer",
    speaking: "Interviewer speaking",
    finishing: "Saving interview",
    disconnected: "Connection paused",
  };
  return (
    <Workspace>
      {query.isPending ? (
        <Loading label="Loading interview…" />
      ) : query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        interview && (
          <>
            <div className="page-title">
              <div>
                <h1>{interview.role} interview</h1>
                <p>
                  {interview.level} · {interview.topics.join(" · ")}
                </p>
              </div>
              <span
                className="tag"
                aria-label="Elapsed time and session duration"
                style={{
                  fontVariantNumeric: "tabular-nums",
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
                        finish.error
                          ? finish.mutate()
                          : state.errorScope === "speech"
                            ? void controller.current?.speakLatest()
                            : void controller.current?.start()
                      }
                    >
                      {finish.error
                        ? "Retry finish"
                        : state.errorScope === "speech"
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
                  onStart={(download, typed) =>
                    void controller.current?.start(download, typed)
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
                        <span className="eyebrow">
                          {state.streaming
                            ? "Interviewer · responding"
                            : "Current question"}
                        </span>
                      </div>
                      <p className="stage-question">
                        {lastQuestion || "Waiting for the first question…"}
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
                  {state.typed ? (
                    <AnswerComposer
                      interviewId={id}
                      onSubmit={(answerId, text) =>
                        controller.current?.answer(answerId, text)
                      }
                    />
                  ) : (
                    <div className="surface pad">
                      <div className="between">
                        <span className="eyebrow">Microphone</span>
                        <button
                          className="text-link"
                          disabled={
                            !state.connected || state.status !== "listening"
                          }
                          onClick={() =>
                            void controller.current?.start(undefined, true)
                          }
                        >
                          Type instead
                        </button>
                      </div>
                      {state.micActive ? (
                        <div
                          className="meter"
                          role="meter"
                          aria-label="Microphone input level"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(
                            Math.min(100, state.level * 100),
                          )}
                        >
                          <span
                            style={{
                              width: `${Math.min(100, state.level * 100)}%`,
                            }}
                          />
                        </div>
                      ) : (
                        <p style={{ marginTop: 12, fontSize: 12 }}>
                          Retry your microphone or choose typed answers.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <LiveTranscript
                  messages={state.messages}
                  streaming={state.streaming}
                  partial={state.partial}
                />
              </div>
            )}
            <dialog ref={dialog} aria-labelledby="finish-title">
              <h2 id="finish-title">Finish interview?</h2>
              <p>
                This ends the interview and generates feedback from saved
                answers. Unsent text will not be included.
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
                  Finish and view feedback
                </button>
              </div>
            </dialog>
          </>
        )
      )}
    </Workspace>
  );
}
