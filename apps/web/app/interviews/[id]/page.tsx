"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Mic,
  MicOff,
  Square,
  RefreshCw,
  VolumeX,
  Volume2,
  FileText,
  Clock3,
  AudioLines,
} from "lucide-react";
import { Workspace } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { VoiceVisual } from "@/components/voice-visual";
import {
  Loading,
  ErrorState,
  InlineAlert,
  PageTitle,
  ConfirmAction,
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
  const [transcriptOpen, setTranscriptOpen] = useState(false);
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
          variant="outline"
          className={
            saved
              ? undefined
              : "border-destructive-border bg-destructive-surface/50 text-destructive hover:bg-destructive-surface hover:text-destructive"
          }
          size="default"
          disabled={finish.isPending}
          aria-label={label}
        >
          <Square className="size-3.5" />
          {saved ? (
            label
          ) : (
            <>
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">Finish</span>
            </>
          )}
        </Button>
      }
    />
  );
  const caption = state.partial || state.streaming;
  const candidateSpeaking = !!state.partial;
  const captionWords = caption.trim().split(/\s+/);
  const shortCaption =
    captionWords.length > 38
      ? `…${captionWords.slice(-38).join(" ")}`
      : caption;
  return (
    <Workspace
      voice
      title={interview ? `${interview.role} interview` : "Interview"}
      actions={
        <Sheet
          open={transcriptOpen}
          onOpenChange={setTranscriptOpen}
          title="Transcript"
          description="Your saved conversation. Read along or revisit a turn."
          trigger={
            <Button variant="outline" size="sm" aria-expanded={transcriptOpen}>
              <FileText />
              Transcript
              <span className="hidden text-muted-foreground sm:inline">
                {state.messages.length}
              </span>
            </Button>
          }
        >
          <LiveTranscript
            messages={state.messages}
            streaming={state.streaming}
            partial={state.partial}
          />
        </Sheet>
      }
    >
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
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    variant={started ? "success" : "outline"}
                    className="gap-1.5"
                  >
                    <span
                      className="size-1.5 rounded-full bg-current"
                      aria-hidden="true"
                    />
                    {state.status === "finishing"
                      ? "Saving"
                      : started
                        ? "Live session"
                        : interview.status === "active"
                          ? "Saved session"
                          : "Not started"}
                  </Badge>
                  <span
                    className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums"
                    aria-label="Elapsed time and session duration"
                  >
                    <Clock3 className="size-3.5" aria-hidden="true" />
                    {clock(elapsed(interview, now))} / {interview.duration}:00
                  </span>
                </div>
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
              <div className="space-y-5 pt-2 sm:pt-6">
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
                {interview.status === "active" && (
                  <div className="text-center">
                    {finishTrigger("Finish saved interview", true)}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-[calc(100dvh-216px)] flex-col items-center">
                <div className="flex w-full flex-1 flex-col items-center justify-center py-2">
                  <VoiceVisual
                    status={state.status}
                    muted={state.muted}
                    micActive={state.micActive}
                    level={state.level}
                    error={!!state.error}
                  />
                  <div
                    className="mt-3 flex min-h-16 w-full max-w-[540px] flex-col items-center justify-start px-2 text-center"
                    data-slot="live-caption"
                    aria-live="off"
                  >
                    {caption ? (
                      <>
                        <span
                          className={`mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium ${candidateSpeaking ? "text-candidate" : "text-primary"}`}
                        >
                          {candidateSpeaking ? (
                            <Mic className="size-3" aria-hidden="true" />
                          ) : (
                            <AudioLines className="size-3" aria-hidden="true" />
                          )}
                          {candidateSpeaking ? "You" : "Interviewer"}
                        </span>
                        <p className="text-sm leading-relaxed text-ink-secondary sm:text-base">
                          {shortCaption}
                        </p>
                      </>
                    ) : (
                      <p className="pt-3 text-xs text-muted-foreground">
                        {state.muted
                          ? "Your microphone is muted."
                          : state.status === "listening"
                            ? "Your turn. Speak naturally when you’re ready."
                            : state.status === "thinking"
                              ? "Considering your answer…"
                              : state.status === "finishing"
                                ? "Saving your conversation…"
                                : "Follow the conversation with your voice."}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 text-xs"
                    disabled={
                      !lastQuestion ||
                      !state.connected ||
                      !capabilities.data?.voice ||
                      state.status === "thinking" ||
                      state.status === "finishing"
                    }
                    onClick={() => void controller.current?.speakLatest()}
                  >
                    <Volume2 className="size-3.5" />
                    Hear question
                  </Button>
                </div>
                <motion.div
                  initial={{ y: 10 }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="z-10 mt-4 flex max-w-full items-center gap-1 rounded-xl bg-card p-2 shadow-[0_5px_20px_rgb(20_19_18/0.09),0_1px_3px_rgb(20_19_18/0.06)] sm:gap-2 sm:p-2.5"
                  role="group"
                  aria-label="Interview controls"
                >
                  <Button
                    variant="ghost"
                    className="px-3 sm:px-4"
                    disabled={!state.micActive || state.status === "finishing"}
                    onClick={() => controller.current?.mute()}
                    aria-pressed={state.muted}
                  >
                    {state.muted ? <MicOff /> : <Mic />}
                    {state.muted ? "Unmute" : "Mute"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-3 sm:px-4"
                    disabled={
                      state.status !== "speaking" && state.status !== "thinking"
                    }
                    onClick={() => controller.current?.interrupt()}
                  >
                    <VolumeX />
                    Interrupt
                  </Button>
                  <span
                    className="mx-1 h-6 w-px shrink-0 bg-border"
                    aria-hidden="true"
                  />
                  {finishTrigger("Finish interview")}
                </motion.div>
                <p className="mt-3 mb-1 text-center text-[11px] text-muted-foreground">
                  Your conversation is saved as you go.
                </p>
              </div>
            )}
          </>
        )
      )}
    </Workspace>
  );
}
