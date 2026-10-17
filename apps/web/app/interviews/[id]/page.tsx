"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mic, MicOff, Square, RefreshCw, VolumeX, Volume2 } from "lucide-react";
import { Workspace } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VoiceVisual } from "@/components/voice-visual";
import {
  Loading,
  ErrorState,
  InlineAlert,
  PageTitle,
  ConfirmAction,
  Eyebrow,
} from "@/components/common";
import { LiveTranscript } from "@/components/transcript";
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
  const finishTrigger = (label: string, saved = false) => (
    <ConfirmAction
      title="Finish interview?"
      description="This ends the interview and generates feedback from saved answers. Wait for your last answer to appear in the conversation before finishing."
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
                  onStart={(download) =>
                    void controller.current?.start(download)
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
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <div className="space-y-6">
                  <Card className="gap-0 overflow-hidden py-0">
                    <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-2">
                      <Eyebrow>Voice interview</Eyebrow>
                      <Badge variant="outline" className="gap-1.5">
                        <span
                          className="size-1.5 rounded-full bg-primary"
                          aria-hidden="true"
                        />
                        Live session
                      </Badge>
                    </div>
                    <VoiceVisual
                      status={state.status}
                      muted={state.muted}
                      micActive={state.micActive}
                      level={state.level}
                      error={!!state.error}
                    />
                    <CardContent className="border-t p-6 xl:px-8">
                      <Eyebrow className="mb-3 block">
                        {state.streaming
                          ? "Interviewer · responding"
                          : "Current question"}
                      </Eyebrow>
                      <p className="max-w-[65ch] text-[22px] leading-[1.4] font-medium tracking-[-0.01em] whitespace-pre-wrap sm:text-2xl">
                        {lastQuestion || "Waiting for the first question…"}
                      </p>
                    </CardContent>
                    <CardFooter className="justify-center flex-wrap gap-2 bg-transparent px-4 py-4 sm:px-6">
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
