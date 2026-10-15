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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loading,
  ErrorState,
  InlineAlert,
  PageTitle,
  ConfirmAction,
  Eyebrow,
} from "@/components/common";
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
  const finishTrigger = (label: string, saved = false) => (
    <ConfirmAction
      title="Finish interview?"
      description="This ends the interview and generates feedback from saved answers. Unsent text will not be included."
      confirmLabel="Finish and view feedback"
      cancelLabel="Keep going"
      pending={finish.isPending}
      onConfirm={() => finish.mutate()}
      trigger={
        <Button
          variant={saved ? "outline" : "destructive"}
          size={saved ? "default" : "sm"}
          disabled={finish.isPending}
        >
          <Square className="size-3.5" />
          {label}
        </Button>
      }
    />
  );
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
            <PageTitle
              title={`${interview.role} interview`}
              description={`${interview.level} · ${interview.topics.join(" · ")}`}
              action={
                <Badge
                  variant="outline"
                  className="px-3 py-2 text-[13px] font-normal tabular-nums"
                  aria-label="Elapsed time and session duration"
                >
                  {clock(elapsed(interview, now))} / {interview.duration}:00
                </Badge>
              }
            />
            {(state.error || finish.error) && (
              <InlineAlert className="mb-5">
                <p>{state.error || finish.error?.message}</p>
                <div className="mt-2">
                  {state.connected ? (
                    <Button
                      variant="link"
                      size="sm"
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
                    </Button>
                  ) : (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => controller.current?.connect()}
                    >
                      <RefreshCw />
                      Reconnect
                    </Button>
                  )}
                </div>
              </InlineAlert>
            )}
            {capabilities.error && (
              <InlineAlert className="mb-5">
                Could not check service availability.{" "}
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => void capabilities.refetch()}
                >
                  Try again
                </Button>
              </InlineAlert>
            )}
            {!started ? (
              <div className="space-y-5">
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
                  <InlineAlert variant="warning">
                    Your conversation is saved.{" "}
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => controller.current?.connect()}
                    >
                      Reconnect to resume
                    </Button>
                  </InlineAlert>
                )}
                {interview.status === "active" &&
                  finishTrigger("Finish saved interview", true)}
              </div>
            ) : (
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(310px,1fr)]">
                <div className="space-y-6">
                  <Card className="gap-0 overflow-hidden py-0">
                    <CardContent className="flex min-h-[295px] flex-col items-start p-6 xl:p-8">
                      <Eyebrow className="mb-6">
                        {state.streaming
                          ? "Interviewer · responding"
                          : "Current question"}
                      </Eyebrow>
                      <p className="font-heading text-[clamp(22px,2vw,29px)] leading-relaxed tracking-tight whitespace-pre-wrap">
                        {lastQuestion || "Waiting for the first question…"}
                      </p>
                      <div
                        className="mt-auto flex items-center gap-2 pt-6 text-xs text-muted-foreground"
                        role="status"
                      >
                        {state.status === "thinking" ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <span className="size-1.5 rounded-full bg-current" />
                        )}
                        {statusLabels[state.status]}
                      </div>
                    </CardContent>
                    <CardFooter className="flex-wrap gap-2 bg-transparent px-6 py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          !lastQuestion ||
                          !state.connected ||
                          !capabilities.data?.voice ||
                          state.status === "thinking" ||
                          state.status === "finishing"
                        }
                        onClick={() => void controller.current?.speakLatest()}
                      >
                        <Volume2 />
                        Hear question
                      </Button>
                      {state.micActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => controller.current?.mute()}
                          aria-pressed={state.muted}
                        >
                          {state.muted ? <MicOff /> : <Mic />}
                          {state.muted ? "Unmute" : "Mute"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={
                          state.status !== "speaking" &&
                          state.status !== "thinking"
                        }
                        onClick={() => controller.current?.interrupt()}
                      >
                        <VolumeX />
                        Interrupt
                      </Button>
                      {finishTrigger("Finish interview")}
                    </CardFooter>
                  </Card>
                  {state.typed ? (
                    <AnswerComposer
                      interviewId={id}
                      onSubmit={(answerId, text) =>
                        controller.current?.answer(answerId, text)
                      }
                    />
                  ) : (
                    <Card>
                      <CardContent>
                        <div className="flex items-center justify-between gap-4">
                          <Eyebrow>Microphone</Eyebrow>
                          <Button
                            variant="link"
                            size="sm"
                            disabled={
                              !state.connected || state.status !== "listening"
                            }
                            onClick={() =>
                              void controller.current?.start(undefined, true)
                            }
                          >
                            Type instead
                          </Button>
                        </div>
                        {state.micActive ? (
                          <Progress
                            className="mt-5 [&_[data-slot=progress-indicator]]:bg-success"
                            role="meter"
                            aria-label="Microphone input level"
                            value={Math.min(100, state.level * 100)}
                          />
                        ) : (
                          <p className="mt-3 text-xs text-muted-foreground">
                            Retry your microphone or choose typed answers.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
                <LiveTranscript
                  messages={state.messages}
                  streaming={state.streaming}
                  partial={state.partial}
                />
              </div>
            )}
          </>
        )
      )}
    </Workspace>
  );
}
