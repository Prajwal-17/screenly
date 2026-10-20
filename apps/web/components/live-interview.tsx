"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AudioLines,
  ChevronDown,
  Check,
  Gauge,
  Mic,
  MicOff,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { InterviewDetail } from "@repo/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LiveTranscript } from "@/components/transcript";
import { MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { PorcelainOrb } from "@/components/porcelain-orb";
import type { Session } from "@/lib/interview-session";
import { clock, elapsed } from "@/lib/api";
import { useInterviewStore, useInterviewView } from "@/store/interviewStore";
import styles from "./live-interview.module.css";

export function LiveInterview({
  interview,
  controller,
  now,
  transcriptOpen,
  transcriptControl,
  closeTranscript,
  notices,
  finishControl,
}: {
  interview: InterviewDetail;
  controller: RefObject<Session | null>;
  now: number;
  transcriptOpen: boolean;
  transcriptControl: ReactNode;
  closeTranscript: () => void;
  notices: ReactNode;
  finishControl: ReactNode;
}) {
  const state = useInterviewView();
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    // A session left paused before the simplified dock mounted must remain usable.
    if (useInterviewStore.getState().paused) {
      void controller.current?.pauseAudio();
    }
  }, [controller, state.paused]);
  const conversation = useRef<HTMLDivElement>(null);
  const questionSurface = useRef<HTMLDivElement>(null);
  const candidateText = useRef<HTMLParagraphElement>(null);
  const readSignal = useCallback(
    () =>
      controller.current?.getVoiceSignal() ?? {
        level: 0,
        low: 0,
        high: 0,
        candidate: false,
        inactive: true,
      },
    [controller],
  );
  const question =
    state.caption?.role === "assistant"
      ? state.caption.text
      : state.streaming ||
        state.messages.filter((message) => message.role === "assistant").at(-1)
          ?.content ||
        "";
  const answer =
    state.partial || (state.caption?.role === "user" ? state.caption.text : "");
  const finishing = state.status === "finishing";
  const speaking = state.status === "speaking" && !state.paused;
  const status = finishing
    ? "Saving interview"
    : state.error
      ? "Needs attention"
      : state.paused
        ? "Audio paused"
        : state.muted
          ? "Microphone muted"
          : state.status === "thinking"
            ? "Interviewer is thinking"
            : speaking
              ? "Interviewer speaking"
              : !state.micActive
                ? "Microphone paused"
                : "Listening to you";
  const hint = finishing
    ? "Saving your conversation and preparing the next step."
    : state.error
      ? "Use the recovery action above to continue."
      : state.paused
        ? "Your microphone and interviewer audio are paused."
        : state.muted
          ? "Unmute your microphone when you’re ready to answer."
          : state.status === "thinking"
            ? "Taking a moment with your answer."
            : speaking
              ? "Listen to the question, or jump in when you’re ready."
              : "Take your time. Think out loud.";
  useLayoutEffect(() => {
    const stage = conversation.current;
    const surface = questionSurface.current;
    if (!stage || !surface) return;
    let frame = 0;
    const fit = () => {
      const text = surface.firstElementChild;
      if (!text || !surface.clientHeight) return;
      surface.style.removeProperty("--question-fit-size");
      let low = 14,
        high = parseFloat(getComputedStyle(text).fontSize);
      if (stage.scrollHeight <= stage.clientHeight) return;
      for (let step = 0; step < 6; step++) {
        const size = (low + high) / 2;
        surface.style.setProperty("--question-fit-size", `${size}px`);
        if (stage.scrollHeight > stage.clientHeight) high = size;
        else low = size;
      }
      surface.style.setProperty("--question-fit-size", `${low}px`);
    };
    fit();
    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    });
    resize.observe(stage);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
    };
  }, [question, answer, transcriptOpen, state.paused, state.caption?.turn]);
  useLayoutEffect(() => {
    const text = candidateText.current;
    if (text) text.scrollTop = text.scrollHeight;
  }, [answer]);
  const mode = finishing
    ? "finishing"
    : state.error
      ? "attention"
      : state.paused
        ? "paused"
        : state.muted
          ? "muted"
          : state.status;

  return (
    <div
      className={styles.room}
      data-transcript-open={transcriptOpen}
      data-long-question={question.length > 300}
    >
      <div className={styles.toolbar}>
        <div className={styles.sessionMeta}>
          <div className={styles.sessionDetail}>
            <span>
              {interview.level} · {interview.topics.join(" · ")}
            </span>
          </div>
        </div>
        <div className={styles.toolbarActions}>
          {transcriptControl}
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
      </div>
      <div className={styles.notices}>{notices}</div>
      <div className={styles.workspace}>
        <section className={styles.stage} aria-label="Current conversation">
          <div className={styles.conversation} ref={conversation}>
            <div
              data-slot="voice-visual"
              data-state={mode}
              className={styles.voiceArea}
            >
              <PorcelainOrb readSignal={readSignal} />
            </div>
            <div
              className={styles.speakerStatus}
              role="status"
              data-candidate={!!answer && state.status === "listening"}
            >
              {state.muted || state.paused ? (
                <MicOff aria-hidden="true" />
              ) : state.status === "listening" ? (
                <Mic aria-hidden="true" />
              ) : (
                <AudioLines aria-hidden="true" />
              )}
              {state.status === "thinking" &&
              !state.paused &&
              !state.error &&
              !state.muted &&
              !finishing ? (
                <Shimmer as="span">{status}</Shimmer>
              ) : (
                status
              )}
            </div>
            <div
              className={styles.question}
              ref={questionSurface}
              tabIndex={0}
              data-slot="live-caption"
              aria-live="off"
            >
              {question ? (
                <MessageResponse
                  key={
                    state.caption?.role === "assistant"
                      ? state.caption.turn
                      : "question"
                  }
                  mode={state.streaming ? "streaming" : "static"}
                  isAnimating={!!state.streaming && !state.paused}
                  data-speaking={speaking}
                  controls={false}
                  className={styles.questionText}
                >
                  {question}
                </MessageResponse>
              ) : (
                <p className={styles.questionText}>
                  {finishing
                    ? "A good place to reflect."
                    : "Let’s start the conversation."}
                </p>
              )}
            </div>
            <p className={styles.hint}>{hint}</p>
            {answer && (
              <div
                className={styles.answer}
                aria-live="off"
                data-slot="candidate-caption"
              >
                <span>
                  <Mic aria-hidden="true" />
                  You{state.partial ? " · transcribing" : ""}
                </span>
                <p ref={candidateText}>{answer}</p>
              </div>
            )}
          </div>
        </section>
        {transcriptOpen && (
          <aside
            id="live-transcript"
            className={styles.transcript}
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
              fit
            />
          </aside>
        )}
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
                    aria-pressed={state.muted}
                  >
                    <span className={styles.micIcon} aria-hidden="true">
                      <AnimatePresence initial={false}>
                        <motion.span
                          key={state.muted ? "muted" : "live"}
                          initial={{
                            opacity: 0,
                            scale: reducedMotion ? 1 : 0.8,
                          }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.8 }}
                          transition={{
                            duration: 0.14,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        >
                          {state.muted ? <MicOff /> : <Mic />}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {state.muted ? "Unmute microphone" : "Mute microphone"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <DropdownMenu>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        className={styles.speed}
                        data-control="speed"
                        disabled={finishing}
                        aria-label={`Interviewer playback speed, ${state.playbackRate}×`}
                      >
                        <Gauge aria-hidden="true" />
                        <motion.span
                          key={state.playbackRate}
                          initial={{ opacity: 0.4 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.14 }}
                        >
                          {state.playbackRate}×
                        </motion.span>
                        <ChevronDown aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <DropdownMenuContent
                    side="top"
                    align="center"
                    className="min-w-44"
                  >
                    <DropdownMenuLabel>Interviewer speed</DropdownMenuLabel>
                    {[1, 1.25, 1.5, 2].map((rate) => (
                      <DropdownMenuItem
                        key={rate}
                        onSelect={() =>
                          controller.current?.setPlaybackRate(rate)
                        }
                        aria-label={`${rate}×${rate === 1 ? " Normal" : ""}`}
                      >
                        <span className="flex-1">
                          {rate}×{rate === 1 ? " · Normal" : ""}
                        </span>
                        {state.playbackRate === rate && (
                          <Check aria-hidden="true" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <TooltipContent>Playback speed</TooltipContent>
              </Tooltip>
              {finishControl}
            </div>
          </footer>
        </TooltipProvider>
      </div>
    </div>
  );
}
