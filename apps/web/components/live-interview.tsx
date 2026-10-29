"use client";

import { type ReactNode, type RefObject } from "react";
import { AudioLines, RotateCcw, Play, Pause, Mic, MicOff } from "lucide-react";
import type { InterviewDetail } from "@repo/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InterviewAudioMenu } from "@/components/interview-audio-menu";
import { useInterviewShortcuts } from "@/lib/interview-shortcuts";
import { LiveTranscript } from "@/components/transcript";
import type { Session } from "@/lib/interview-session";
import { clock, elapsed } from "@/lib/api";
import { useInterviewView } from "@/store/interviewStore";
import styles from "./live-interview.module.css";

export function LiveInterview({
  interview,
  controller,
  now,
  notices,
  finishControl,
}: {
  interview: InterviewDetail;
  controller: RefObject<Session | null>;
  now: number;
  notices: ReactNode;
  finishControl: ReactNode;
}) {
  const state = useInterviewView();
  const finishing = state.status === "finishing";
  const canReplay =
    state.connected &&
    !finishing &&
    !state.paused &&
    state.messages.some((message) => message.role === "assistant");
  useInterviewShortcuts({
    mute: () => {
      if (state.micActive && !finishing) controller.current?.mute();
    },
    replay: () => {
      if (canReplay) void controller.current?.speakLatest();
    },
    transcript: () =>
      document
        .querySelector<HTMLElement>('#live-transcript [role="log"]')
        ?.focus(),
    pause: () => {
      if (!finishing && !state.pausePending)
        void controller.current?.pauseAudio();
    },
  });
  const status = finishing
    ? "Saving interview"
    : state.error
      ? "Needs attention"
      : state.paused
        ? "Interview paused"
        : !state.connected
          ? "Reconnecting"
          : state.muted
            ? "Microphone muted"
            : state.status === "thinking"
              ? "Interviewer is thinking"
              : state.status === "speaking"
                ? "Interviewer speaking"
                : !state.micActive
                  ? "Microphone paused"
                  : interview.phase === "opening"
                    ? "Ready when you are"
                    : "Listening to you";
  const StatusIcon = state.paused
    ? Pause
    : state.muted
      ? MicOff
      : state.status === "listening"
        ? Mic
        : AudioLines;
  return (
    <div className={styles.room}>
      <div className={styles.toolbar}>
        <div className={styles.sessionDetail}>
          {interview.role} · {interview.level}
        </div>
        <Badge variant="secondary" asChild className={styles.timer}>
          <div
            role="timer"
            aria-label="Elapsed time and session duration"
            aria-live="off"
          >
            <span>{clock(elapsed(interview, now))}</span>
            <span>/ {clock(interview.duration * 60)}</span>
          </div>
        </Badge>
      </div>
      <div className={styles.notices}>{notices}</div>
      <div className={styles.status} role="status">
        <StatusIcon className="size-4" aria-hidden="true" />
        {status}
      </div>
      {state.paused && (
        <Button
          variant="secondary"
          size="sm"
          className={styles.resume}
          disabled={state.pausePending || !state.connected}
          onClick={() => void controller.current?.pauseAudio()}
          aria-keyshortcuts="Space"
        >
          <Play /> Resume interview
        </Button>
      )}
      {interview.phase === "opening" && !state.paused && (
        <p className={styles.openingHint}>
          Say “ready” to begin. The timer starts with the first technical
          question.
        </p>
      )}
      <div id="live-transcript" className={styles.transcript}>
        <LiveTranscript
          messages={state.messages}
          streaming={state.streaming}
          partial={state.partial}
          fit
        />
      </div>
      <TooltipProvider>
        <footer className={styles.dockWrap}>
          <div
            className={styles.dock}
            role="group"
            aria-label="Interview controls"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={styles.microphone}
                  data-control="microphone"
                  disabled={!state.micActive || finishing}
                  onClick={() => controller.current?.mute()}
                  aria-label={state.muted ? "Unmute" : "Mute"}
                  aria-keyshortcuts="M"
                  aria-pressed={state.muted}
                >
                  {state.muted ? <MicOff /> : <Mic />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {state.muted ? "Unmute microphone" : "Mute microphone"}{" "}
                <kbd>M</kbd>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  className={styles.replay}
                  data-control="replay"
                  disabled={!canReplay}
                  onClick={() => void controller.current?.speakLatest()}
                  aria-label="Replay interviewer"
                  aria-keyshortcuts="R"
                >
                  <RotateCcw aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Replay interviewer <kbd>R</kbd>
              </TooltipContent>
            </Tooltip>
            <InterviewAudioMenu
              controller={controller}
              disabled={finishing || !state.connected}
            />
            {finishControl}
          </div>
        </footer>
      </TooltipProvider>
    </div>
  );
}
