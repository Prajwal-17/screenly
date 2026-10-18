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
      hint: "Take your time. Think out loud.",
      icon: Mic,
    },
    thinking: {
      label: "Interviewer is thinking",
      hint: "Making space for the next question.",
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
      hint: "Retry your microphone to continue.",
      icon: MicOff,
    },
    attention: {
      label: "Needs attention",
      hint: "Use the recovery action above to continue.",
      icon: CircleAlert,
    },
    finishing: {
      label: "Saving interview",
      hint: "Preparing your conversation for feedback.",
      icon: Save,
    },
    disconnected: {
      label: "Connection paused",
      hint: "Reconnect to continue your conversation.",
      icon: CircleAlert,
    },
  };
  const current = states[mode];
  const Icon = current.icon;
  const active = ["listening", "thinking", "speaking"].includes(mode);
  const input =
    mode === "listening" && Number.isFinite(level)
      ? Math.min(1, Math.max(0, level * 4))
      : 0;
  return (
    <div
      className="relative flex w-full max-w-md flex-col items-center text-center"
      data-slot="voice-experience"
    >
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <AudioLines className="size-3.5" aria-hidden="true" />
        Screenly interviewer
      </div>
      <div
        className={styles.visual}
        data-slot="voice-visual"
        data-state={mode}
        data-animated={!paused && active}
        aria-hidden="true"
        style={{ "--voice-level": input } as CSSProperties}
      >
        <div className={styles.outline} />
        <div className={styles.reactive}>
          <div className={styles.orb}>
            <div className={styles.surface} />
            <div className={styles.ribbons} />
          </div>
        </div>
      </div>
      <div
        className="mt-4 flex items-center justify-center gap-2 text-base font-medium"
        role="status"
      >
        <Icon className="size-4 text-primary" aria-hidden="true" />
        {current.label}
      </div>
      <p className="mt-1 max-w-[40ch] text-xs text-muted-foreground">
        {current.hint}
      </p>
      <div className="mt-2 flex min-h-5 items-center justify-center gap-2.5 text-[11px] text-muted-foreground">
        {micActive && (
          <>
            <Mic className="size-3" aria-hidden="true" />
            <span>{muted ? "Mic off" : "Mic on"}</span>
            <Progress
              role="meter"
              aria-label="Microphone input level"
              value={muted ? 0 : Math.min(100, Math.max(0, level * 100))}
              className="h-1 w-14"
            />
          </>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-0 right-0 motion-reduce:hidden"
          aria-label={paused ? "Resume animation" : "Pause animation"}
          title={paused ? "Resume animation" : "Pause animation"}
          onClick={() => setPaused(!paused)}
        >
          {paused ? (
            <CirclePlay className="size-3.5" />
          ) : (
            <CirclePause className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
