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
  FileText,
  AudioLines,
} from "lucide-react";
import { Workspace } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import StreamingText from "@/components/primitives/StreamingText";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { VoiceVisual } from "@/components/voice-visual";
import {
  Loading,
  ErrorState,
  InlineAlert,
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
  const transcriptTrigger = useRef<HTMLButtonElement>(null);
  const transcriptScroll = useRef(0);
  const closeTranscript = () => {
    setTranscriptOpen(false);
    requestAnimationFrame(() => {
      transcriptTrigger.current?.focus({ preventScroll: true });
      window.scrollTo({ top: transcriptScroll.current, behavior: "instant" });
    });
  };
  useEffect(() => {
    if (transcriptOpen && window.matchMedia("(max-width: 1023px)").matches)
      document
        .getElementById("live-transcript")
        ?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [transcriptOpen]);
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
    // Strict Mode cleans up its first mount before this runs, avoiding a second
    // socket racing the first socket's close on the server.
    queueMicrotask(() => session.connect());
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
  const notices = (
    <>
      {(state.error || finish.error) && (
        <InlineAlert className={started ? "mb-5" : undefined}>
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
        <InlineAlert className={started ? "mb-5" : undefined}>
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
    </>
  );
  const transcriptControl =
    started || interview?.status === "active" || state.messages.length > 0 ? (
      <Button
        ref={transcriptTrigger}
        variant={transcriptOpen ? "secondary" : "outline"}
        size="sm"
        aria-expanded={transcriptOpen}
        aria-controls="live-transcript"
        onClick={() => {
          if (transcriptOpen) closeTranscript();
          else {
            transcriptScroll.current = window.scrollY;
            setTranscriptOpen(true);
          }
        }}
      >
        <FileText />
        Transcript
        <span className="hidden text-muted-foreground sm:inline">
          {state.messages.length}
        </span>
      </Button>
    ) : undefined;
  const caption = state.caption;
  const candidateSpeaking = caption?.role === "user";
  const captionWords = caption?.text.match(/\S+\s*/g) ?? [];
  const captionTokens = captionWords.map((text, index) => ({
    text,
    id: String(index),
  }));
  return (
    <Workspace
      voice
      interviewActive={interview?.status === "active"}
      title={interview ? `${interview.role} interview` : "Interview"}
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
          <div
            className={
              started ? "flex min-h-[calc(100dvh-72px)] flex-col" : undefined
            }
          >
            {started && (
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-b py-3 sm:flex sm:gap-6">
                <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-2 sm:flex-1 sm:gap-3">
                  <Badge variant="success" className="gap-1.5">
                    <span
                      className="size-1.5 rounded-full bg-current"
                      aria-hidden="true"
                    />
                    {state.status === "finishing" ? "Saving" : "Live session"}
                  </Badge>
                  <p className="min-w-0 text-xs text-muted-foreground">
                    {interview.level} · {interview.topics.join(" · ")}
                  </p>
                </div>
                <div
                  role="timer"
                  aria-label="Elapsed time and session duration"
                  aria-live="off"
                  className="flex items-baseline gap-2 whitespace-nowrap tabular-nums"
                >
                  <span className="text-[30px] leading-none font-medium tracking-[-0.025em] sm:text-4xl">
                    {clock(elapsed(interview, now))}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {clock(interview.duration * 60)}
                  </span>
                </div>
                <div className="justify-self-end">{transcriptControl}</div>
              </div>
            )}
            {started && notices}
            {!started ? (
              <div className="space-y-5">
                <Preflight
                  interview={interview}
                  capabilities={capabilities.data}
                  disabled={!state.connected}
                  starting={state.starting}
                  notice={notices}
                  secondaryAction={
                    interview.status === "active" ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {transcriptControl}
                        {finishTrigger("Finish saved interview", true)}
                      </div>
                    ) : undefined
                  }
                  onStart={() => void controller.current?.start()}
                />
                {transcriptOpen && (
                  <div
                    id="live-transcript"
                    className="mx-auto max-w-3xl scroll-mt-20 border-t pt-6"
                  >
                    <LiveTranscript
                      messages={state.messages}
                      streaming={state.streaming}
                      partial={state.partial}
                      onClose={closeTranscript}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div
                className={cn(
                  "grid flex-1 items-stretch gap-8 pt-4",
                  transcriptOpen &&
                    "lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]",
                )}
              >
                <div className="flex min-h-0 min-w-0 flex-col items-center">
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
                      {caption?.text ? (
                        <>
                          <span
                            className={`mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium ${candidateSpeaking ? "text-candidate" : "text-primary"}`}
                          >
                            {candidateSpeaking ? (
                              <Mic className="size-3" aria-hidden="true" />
                            ) : (
                              <AudioLines
                                className="size-3"
                                aria-hidden="true"
                              />
                            )}
                            {candidateSpeaking ? "You" : "Interviewer"}
                          </span>
                          <StreamingText
                            key={`${caption.role}:${caption.turn}`}
                            content={captionTokens}
                            isStreaming={
                              candidateSpeaking
                                ? !!state.partial
                                : state.status === "speaking"
                            }
                            className="text-center sm:text-base"
                          />
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
                      disabled={
                        !state.micActive || state.status === "finishing"
                      }
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
                        state.status !== "speaking" &&
                        state.status !== "thinking"
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
                </div>
                {transcriptOpen && (
                  <div
                    id="live-transcript"
                    className="min-w-0 scroll-mt-20 border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7"
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.stopPropagation();
                        closeTranscript();
                      }
                    }}
                  >
                    <LiveTranscript
                      messages={state.messages}
                      streaming={state.streaming}
                      partial={state.partial}
                      onClose={closeTranscript}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}
    </Workspace>
  );
}
