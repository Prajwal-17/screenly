"use client";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Square, Phone, RefreshCw, FileText } from "lucide-react";
import { Workspace } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { LiveInterview } from "@/components/live-interview";
import { Loading, ErrorState } from "@/components/common";
import { FinishInterviewDialog } from "@/components/finish-interview-dialog";
import { useInterviewExitGuard } from "@/components/interview-exit-guard";
import { LiveTranscript } from "@/components/transcript";
import { InterviewNotice } from "@/components/interview-notice";
import { Preflight } from "@/components/preflight";
import { Session } from "@/lib/interview-session";
import { useInterviewView } from "@/store/interviewStore";
import { api } from "@/lib/api";
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
  const state = useInterviewView();
  const interview = state.interview?.id === id ? state.interview : query.data;
  const started = ["listening", "thinking", "speaking", "finishing"].includes(
    state.status,
  );
  const {
    confirmExit,
    allowExit,
    endingForExit,
    dialog: exitDialog,
  } = useInterviewExitGuard({
    id,
    enabled:
      interview?.status === "active" ||
      (state.interview?.id === id && (started || state.starting)),
    timerStarted: interview?.startedAt != null,
    timerPaused: interview?.pausedAt != null,
    endInterview: () => finish.mutateAsync(true),
  });
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const transcriptTrigger = useRef<HTMLButtonElement>(null);
  const closeTranscript = useCallback(() => {
    setTranscriptOpen(false);
    requestAnimationFrame(() => {
      transcriptTrigger.current?.focus({ preventScroll: true });
    });
  }, []);
  const toggleTranscript = useCallback(() => {
    if (transcriptOpen) closeTranscript();
    else setTranscriptOpen(true);
  }, [transcriptOpen, closeTranscript]);
  useEffect(() => {
    const shortWindow = matchMedia(
      "(max-width: 767px) and (max-height: 500px)",
    );
    const adapt = () => {
      if (shortWindow.matches) setTranscriptOpen(false);
    };
    adapt();
    shortWindow.addEventListener("change", adapt);
    return () => shortWindow.removeEventListener("change", adapt);
  }, []);
  const [now, setNow] = useState(() => Date.now());
  const finish = useMutation({
    mutationFn: (generateFeedback: boolean) => api.finish(id, generateFeedback),
    onSuccess: (data) => {
      client.setQueryData(["interview", id], data);
      void client.invalidateQueries({ queryKey: ["interviews"] });
      if (endingForExit.current) return;
      allowExit();
      router.push(
        data.feedbackStatus === "skipped"
          ? "/history"
          : `/interviews/${id}/feedback`,
      );
    },
  });
  useEffect(() => {
    if (!authId) return;
    const session = new Session(id, (done, generateFeedback) => {
      void client.invalidateQueries({ queryKey: ["interviews"] });
      void client.invalidateQueries({ queryKey: ["interview", done] });
      if (endingForExit.current) return;
      allowExit();
      router.push(
        generateFeedback ? `/interviews/${done}/feedback` : "/history",
      );
    });
    controller.current = session;
    // Strict Mode cleans up its first mount before this runs, avoiding a second
    // socket racing the first socket's close on the server.
    queueMicrotask(() => session.connect());
    return () => {
      session.close();
      controller.current = null;
    };
  }, [id, authId, router, client, allowExit, endingForExit]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const finishTrigger = (label: string, saved = false) => (
    <FinishInterviewDialog
      pending={finish.isPending}
      onFinish={(generateFeedback) => finish.mutate(generateFeedback)}
      tooltip={saved ? undefined : "Finish interview"}
      trigger={
        <Button
          variant={saved ? "outline" : "destructive"}
          size={saved ? "default" : "icon-lg"}
          data-control={saved ? undefined : "finish"}
          disabled={finish.isPending || state.status === "finishing"}
          aria-label={label}
        >
          {saved ? (
            <>
              <Square className="size-3.5" />
              {label}
            </>
          ) : (
            <Phone className="rotate-[135deg]" aria-hidden="true" />
          )}
        </Button>
      }
    />
  );
  const notices = (
    <>
      {(state.error || finish.error) && (
        <InterviewNotice
          action={
            state.connected ? (
              <Button
                variant="outline"
                size="sm"
                loading={finish.isPending || state.starting}
                onClick={() =>
                  finish.error
                    ? finish.mutate(finish.variables ?? true)
                    : state.errorScope === "speech"
                      ? void controller.current?.speakLatest()
                      : void controller.current?.start()
                }
              >
                <RefreshCw aria-hidden="true" />
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
                variant="outline"
                size="sm"
                onClick={() => controller.current?.connect()}
              >
                <RefreshCw aria-hidden="true" />
                Reconnect
              </Button>
            )
          }
        >
          {state.error || finish.error?.message}
        </InterviewNotice>
      )}
      {capabilities.error && (
        <InterviewNotice
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void capabilities.refetch()}
            >
              <RefreshCw aria-hidden="true" />
              Try again
            </Button>
          }
        >
          Could not check service availability.
        </InterviewNotice>
      )}
      {state.status === "disconnected" && !state.error && (
        <InterviewNotice
          warning
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => controller.current?.connect()}
            >
              <RefreshCw aria-hidden="true" />
              Reconnect to resume
            </Button>
          }
        >
          Your conversation is saved.
        </InterviewNotice>
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
        aria-keyshortcuts="T"
        onClick={toggleTranscript}
      >
        <FileText />
        Transcript
        <span className="hidden text-muted-foreground sm:inline">
          {state.messages.length}
        </span>
      </Button>
    ) : undefined;
  return (
    <Workspace
      voice
      immersive={started}
      interviewActive={interview?.status === "active"}
      beforeNavigate={confirmExit}
      title={interview ? `${interview.role} interview` : "Interview"}
    >
      {query.isPending ? (
        <Loading label="Loading interview…" />
      ) : query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        interview &&
        (started ? (
          <LiveInterview
            interview={interview}
            controller={controller}
            now={now}
            transcriptOpen={transcriptOpen}
            transcriptControl={transcriptControl}
            closeTranscript={closeTranscript}
            toggleTranscript={toggleTranscript}
            notices={notices}
            finishControl={finishTrigger("Finish interview")}
          />
        ) : (
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
            {transcriptOpen &&
              (interview.status === "active" || state.messages.length > 0) && (
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
        ))
      )}
      {exitDialog}
    </Workspace>
  );
}
