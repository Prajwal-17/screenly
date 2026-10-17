"use client";

import { useState, type CSSProperties } from "react";
import {
  AudioLines,
  CirclePause,
  CirclePlay,
  Loader2,
  Mic,
  MicOff,
  CircleAlert,
  Save,
} from "lucide-react";
import type { LiveStatus } from "@repo/shared";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import styles from "./voice-visual.module.css";

export function VoiceVisual({
  status,
  muted,
  micActive,
  level,
  error,
}: {
  status: LiveStatus;
  muted: boolean;
  micActive: boolean;
  level: number;
  error: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const mode =
    status === "finishing"
      ? "finishing"
      : error
        ? "attention"
        : status === "listening" && muted
          ? "muted"
          : status === "listening" && !micActive
            ? "paused"
            : status;
  const states = {
    connecting: {
      label: "Connecting",
      hint: "Getting your conversation ready.",
      icon: Loader2,
    },
    ready: {
      label: "Ready when you are",
      hint: "Your interview will begin when you start.",
      icon: Mic,
    },
    listening: {
      label: "Listening to you",
      hint: "Speak naturally. Take your time with your answer.",
      icon: Mic,
    },
    thinking: {
      label: "Interviewer is thinking",
      hint: "Your interviewer is preparing the next question.",
      icon: Loader2,
    },
    speaking: {
      label: "Interviewer speaking",
      hint: "Listen, or interrupt when you’re ready to respond.",
      icon: AudioLines,
    },
    muted: {
      label: "Microphone muted",
      hint: "Unmute when you’re ready to continue.",
      icon: MicOff,
    },
    paused: {
      label: "Microphone paused",
      hint: "Retry your microphone to continue speaking.",
      icon: MicOff,
    },
    attention: {
      label: "Needs attention",
      hint: "Use the recovery action above to continue.",
      icon: CircleAlert,
    },
    finishing: {
      label: "Saving interview",
      hint: "Preparing your saved conversation for feedback.",
      icon: Save,
    },
    disconnected: {
      label: "Connection paused",
      hint: "Reconnect to continue your conversation.",
      icon: CircleAlert,
    },
  };
  const state = states[mode];
  const active = ["listening", "thinking", "speaking"].includes(mode);
  const input =
    mode === "listening" && Number.isFinite(level)
      ? Math.min(1, Math.max(0, level * 4))
      : 0;
  const Icon = state.icon;
  return (
    <div
      className="relative flex flex-col items-center px-6 pt-2 pb-6 text-center"
      data-slot="voice-experience"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-0 right-4 z-10 motion-reduce:hidden"
        aria-label={paused ? "Resume animation" : "Pause animation"}
        title={paused ? "Resume animation" : "Pause animation"}
        onClick={() => setPaused(!paused)}
      >
        {paused ? <CirclePlay /> : <CirclePause />}
      </Button>
      <div
        className={styles.visual}
        data-slot="voice-visual"
        data-state={mode}
        data-animated={!paused && active}
        aria-hidden="true"
        style={{ "--voice-level": input } as CSSProperties}
      >
        <div className="relative size-48 sm:size-56">
          <div className={styles.outline} />
          <div className={`${styles.reactive} absolute inset-0`}>
            <div className={styles.orb}>
              <div className={styles.surface} />
              <svg className={styles.ribbons} viewBox="0 0 200 200" fill="none">
                <path
                  d="M-20 93C30 25 61 158 103 102S167 30 222 103"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M-20 104C30 36 61 169 103 113S167 41 222 114"
                  stroke="currentColor"
                  strokeWidth="1"
                />
                <path
                  d="M-20 115C30 47 61 180 103 124S167 52 222 125"
                  stroke="currentColor"
                  strokeWidth="0.75"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div
        className="mt-3 flex items-center justify-center gap-2 text-lg leading-snug font-medium"
        role="status"
      >
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span>{state.label}</span>
      </div>
      <p className="mt-2 max-w-[40ch] text-[13px] leading-relaxed text-muted-foreground">
        {state.hint}
      </p>
      {micActive && (
        <div className="mt-5 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <Mic className="size-3.5" aria-hidden="true" />
          <span>{muted ? "Mic off" : "Mic on"}</span>
          <Progress
            className="w-20"
            role="meter"
            aria-label="Microphone input level"
            value={muted ? 0 : Math.min(100, Math.max(0, level * 100))}
          />
        </div>
      )}
    </div>
  );
}
