"use client";
import { useState, useRef, useEffect } from "react";
import { Mic, Volume2, Check, ArrowRight, Loader2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { InlineAlert } from "@/components/common";
import { closeAudioContext } from "@/lib/audio-context";
import { clock, elapsed } from "@/lib/api";
import type { InterviewDetail, Capabilities } from "@repo/shared";
export function Preflight({
  interview,
  capabilities,
  disabled,
  starting,
  notice,
  secondaryAction,
  onStart,
}: {
  interview: InterviewDetail;
  capabilities?: Capabilities;
  disabled: boolean;
  starting: boolean;
  notice?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  onStart: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const checkVersion = useRef(0);
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      checkVersion.current += 1;
      cleanup.current();
    };
  }, []);
  async function testMic() {
    const version = (checkVersion.current += 1);
    cleanup.current();
    setChecked(false);
    setTesting(true);
    setError("");
    let checkedStream: MediaStream | null = null;
    let checkedContext: AudioContext | null = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true },
      });
      checkedStream = stream;
      if (!mounted.current || version !== checkVersion.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const ctx = new AudioContext();
      checkedContext = ctx;
      await ctx.resume();
      if (!mounted.current || version !== checkVersion.current) {
        stream.getTracks().forEach((t) => t.stop());
        void closeAudioContext(ctx);
        return;
      }
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let active = true;
      let frame = 0;
      const update = () => {
        if (!active) return;
        analyser.getByteTimeDomainData(data);
        setLevel(
          Math.min(
            100,
            Math.sqrt(
              data.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) /
                data.length,
            ) * 500,
          ),
        );
        frame = requestAnimationFrame(update);
      };
      update();
      const timer = setTimeout(() => {
        cleanup.current();
        setTesting(false);
        setChecked(true);
        setLevel(0);
      }, 4000);
      cleanup.current = () => {
        if (!active) return;
        active = false;
        cleanup.current = () => {};
        clearTimeout(timer);
        cancelAnimationFrame(frame);
        source.disconnect();
        stream.getTracks().forEach((t) => t.stop());
        void closeAudioContext(ctx);
      };
    } catch {
      checkedStream?.getTracks().forEach((track) => track.stop());
      void closeAudioContext(checkedContext);
      if (!mounted.current || version !== checkVersion.current) return;
      setError("Allow microphone access in your browser, then retry.");
      setTesting(false);
    }
  }
  async function testSound() {
    setError("");
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
      await ctx.resume();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.08;
      oscillator.frequency.value = 440;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.onended = () => void closeAudioContext(ctx);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.25);
    } catch {
      void closeAudioContext(ctx);
      if (mounted.current)
        setError("Speaker test failed. Check your audio output and retry.");
    }
  }
  return (
    <section
      className="mx-auto grid w-full max-w-[760px] gap-8 py-10 sm:py-16 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 lg:py-24"
      aria-labelledby="preflight-title"
    >
      <div>
        <h2
          id="preflight-title"
          className="text-2xl leading-tight font-semibold tracking-[-0.025em]"
        >
          {interview.status === "active"
            ? "Welcome back."
            : "Before you begin."}
        </h2>
        <p className="mt-4 text-sm text-ink-secondary">
          {interview.level}{" "}
          <span className="px-1 text-muted-foreground" aria-hidden="true">
            ·
          </span>{" "}
          {interview.duration} min
        </p>
        <p className="mt-1.5 max-w-[40ch] text-sm leading-relaxed text-muted-foreground">
          {interview.topics.join(" · ")}
        </p>
        {interview.status === "active" && (
          <p className="mt-4 max-w-[36ch] text-xs leading-relaxed text-muted-foreground">
            Your conversation is saved. Continue with the time remaining.
          </p>
        )}
      </div>
      <div className="min-w-0">
        <div className="divide-y border-y">
          <div className="py-2">
            <div className="flex min-h-12 items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-3 text-[13px] font-medium">
                {checked ? (
                  <Check
                    className="size-[18px] shrink-0 text-primary"
                    aria-hidden="true"
                  />
                ) : (
                  <Mic
                    className="size-[18px] shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                Microphone
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 px-3 text-xs"
                disabled={testing}
                aria-label={
                  testing
                    ? "Listening for 4 seconds…"
                    : checked
                      ? "Check microphone again"
                      : "Check microphone"
                }
                onClick={() => void testMic()}
              >
                {testing && (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                )}
                {testing ? "Checking…" : checked ? "Check again" : "Check"}
              </Button>
            </div>
            <span role="status" className="sr-only">
              {testing
                ? "Checking microphone access."
                : checked
                  ? "Microphone access confirmed."
                  : ""}
            </span>
            {testing && (
              <div className="flex items-center gap-3 pb-3 pl-[30px]">
                <Progress
                  role="meter"
                  aria-label="Microphone input level"
                  value={level}
                  className="h-1 flex-1"
                />
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  Speak naturally
                </span>
              </div>
            )}
          </div>
          <div className="flex min-h-16 items-center justify-between gap-3 py-2">
            <span className="flex items-center gap-3 text-[13px] font-medium">
              <Volume2
                className="size-[18px] shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              Speakers
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 px-3 text-xs"
              onClick={() => void testSound()}
            >
              Test sound
            </Button>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {notice}
          {capabilities && !capabilities.llm && (
            <InlineAlert variant="warning">
              The interviewer is unavailable. Try again later.
            </InlineAlert>
          )}
          {capabilities && !capabilities.voice && (
            <InlineAlert variant="warning">
              Voice interviews are unavailable. Try again later.
            </InlineAlert>
          )}
          {error && <InlineAlert>{error}</InlineAlert>}
          <Button
            className="w-full justify-between"
            loading={starting}
            disabled={
              disabled ||
              starting ||
              testing ||
              !capabilities?.llm ||
              !capabilities?.voice
            }
            onClick={() => {
              checkVersion.current += 1;
              cleanup.current();
              onStart();
            }}
          >
            {interview.status === "active"
              ? "Resume interview"
              : "Start interview"}
            <ArrowRight aria-hidden="true" />
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock3 className="size-3 shrink-0" aria-hidden="true" />
            {interview.startedAt != null
              ? `${clock(Math.max(0, interview.duration * 60 - elapsed(interview)))} remaining`
              : interview.phase === "opening"
                ? "A short introduction first. Your timer starts with the first technical question."
                : "Your timer starts when the interviewer begins speaking."}
          </p>
          {secondaryAction && <div className="pt-2">{secondaryAction}</div>}
        </div>
      </div>
    </section>
  );
}
