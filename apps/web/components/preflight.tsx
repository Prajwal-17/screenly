"use client";
import { useState, useRef, useEffect, type CSSProperties } from "react";
import Link from "next/link";
import {
  Mic,
  Volume2,
  ArrowRight,
  ArrowLeft,
  Pencil,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/common";
import { closeAudioContext } from "@/lib/audio-context";
import { clock, elapsed } from "@/lib/api";
import type { InterviewDetail, Capabilities } from "@repo/shared";
import styles from "./preflight.module.css";

const inputEnvelope = Array.from(
  { length: 57 },
  (_, index) => 0.15 + 0.85 * Math.sin((index / 56) * Math.PI) ** 2,
);
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
  const [soundTesting, setSoundTesting] = useState(false);
  const [soundTested, setSoundTested] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const checkVersion = useRef(0);
  const soundVersion = useRef(0);
  const cleanup = useRef<() => void>(() => {});
  const cleanupSound = useRef<() => void>(() => {});
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      checkVersion.current += 1;
      soundVersion.current += 1;
      cleanup.current();
      cleanupSound.current();
    };
  }, []);
  async function testMic() {
    if (testing || starting) return;
    const version = (checkVersion.current += 1);
    cleanup.current();
    setChecked(false);
    setTesting(true);
    setLevel(0);
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
    if (soundTesting || starting) return;
    const version = (soundVersion.current += 1);
    cleanupSound.current();
    setError("");
    setSoundTesting(true);
    setSoundTested(false);
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
      await ctx.resume();
      if (!mounted.current || version !== soundVersion.current) {
        void closeAudioContext(ctx);
        return;
      }
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.08;
      oscillator.frequency.value = 440;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      let active = true;
      const release = () => {
        if (!active) return;
        active = false;
        oscillator.onended = null;
        oscillator.disconnect();
        gain.disconnect();
        void closeAudioContext(ctx);
        cleanupSound.current = () => {};
      };
      cleanupSound.current = () => {
        if (!active) return;
        oscillator.onended = null;
        try {
          oscillator.stop();
        } catch {
          // An oscillator whose start failed still needs its nodes released.
        }
        release();
      };
      oscillator.onended = () => {
        release();
        if (mounted.current && version === soundVersion.current) {
          setSoundTesting(false);
          setSoundTested(true);
        }
      };
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.25);
    } catch {
      cleanupSound.current();
      void closeAudioContext(ctx);
      if (mounted.current && version === soundVersion.current) {
        setSoundTesting(false);
        setError("Speaker test failed. Check your audio output and retry.");
      }
    }
  }
  const active = interview.status === "active";
  const setupHref = `/interviews/new?role=${encodeURIComponent(interview.role)}`;
  return (
    <section
      className="mx-auto w-full max-w-2xl py-3 sm:py-5"
      aria-labelledby="preflight-title"
      data-audio-preflight=""
    >
      <header className="mb-6">
        <h2 id="preflight-title" className="type-page-title">
          {active ? "Resume interview" : "Check your audio"}
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-2 type-caption text-muted-foreground">
          <span className="font-medium text-foreground">{interview.role}</span>
          <span aria-hidden="true">·</span>
          <span>{interview.level}</span>
          <span aria-hidden="true">·</span>
          <span>{interview.duration} min</span>
          {!active && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="ml-auto px-0 type-caption"
            >
              <Link href={setupHref}>
                Change role
                <Pencil className="size-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </header>
      <div className="mb-5 space-y-3">
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
      </div>
      <div className="border-y">
        <div className="flex items-center gap-3 py-5">
          <Mic
            className="size-[18px] shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <h3 className="type-label">Microphone</h3>
            <p className="mt-1 type-caption text-muted-foreground">
              Browser default microphone
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={starting}
            loading={testing}
            loadingLabel="Listening…"
            aria-label={
              testing
                ? "Listening for 4 seconds"
                : checked
                  ? "Test input again"
                  : "Test input"
            }
            onClick={() => void testMic()}
          >
            {checked ? "Test input again" : "Test input"}
          </Button>
        </div>
        <div className="flex min-h-28 flex-col items-center justify-center gap-4 pb-5 sm:min-h-32">
          <div
            className={styles.waveform}
            data-testing={testing}
            role="meter"
            aria-label="Microphone input level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(level)}
            aria-valuetext={
              testing
                ? `${Math.round(level)} percent`
                : checked
                  ? "Microphone access confirmed"
                  : "Not tested"
            }
            style={{ "--input-level": testing ? level : 0 } as CSSProperties}
          >
            {inputEnvelope.map((strength, index) => (
              <span
                key={index}
                className={styles.bar}
                style={{ "--input-strength": strength } as CSSProperties}
                aria-hidden="true"
              />
            ))}
          </div>
          <p
            role="status"
            className={`flex items-center gap-2 type-caption ${checked ? "text-success" : "text-muted-foreground"}`}
          >
            <span
              className={`size-1.5 shrink-0 rounded-full ${checked ? "bg-success" : "border border-input"}`}
              aria-hidden="true"
            />
            {testing
              ? "Listening… say a few words."
              : checked
                ? "Microphone access confirmed."
                : "Your voice will appear here."}
          </p>
        </div>
        <div className="flex items-center gap-3 border-t py-5">
          <Volume2
            className="size-[18px] shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <h3 className="type-label">Speakers</h3>
            <p
              role="status"
              className="mt-1 type-caption text-muted-foreground"
            >
              {soundTested ? "Test sound played" : "Browser default output"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={starting}
            loading={soundTesting}
            loadingLabel="Playing…"
            aria-label={
              soundTesting
                ? "Playing test sound"
                : soundTested
                  ? "Play again"
                  : "Test sound"
            }
            onClick={() => void testSound()}
          >
            <Play className="size-3.5" />
            {soundTested ? "Play again" : "Test sound"}
          </Button>
        </div>
      </div>
      <footer className="mt-6 flex flex-wrap items-center justify-between gap-4">
        {!active ? (
          <Button asChild variant="ghost" size="sm" className="px-0">
            <Link href={setupHref}>
              <ArrowLeft />
              Back
            </Link>
          </Button>
        ) : (
          <span />
        )}
        <Button
          className="min-w-40"
          loading={starting}
          loadingLabel="Connecting…"
          aria-label={active ? "Resume interview" : "Start interview"}
          disabled={
            disabled ||
            starting ||
            testing ||
            soundTesting ||
            !capabilities?.llm ||
            !capabilities?.voice
          }
          onClick={() => {
            checkVersion.current += 1;
            soundVersion.current += 1;
            cleanup.current();
            cleanupSound.current();
            onStart();
          }}
        >
          {active ? "Resume interview" : "Start interview"}
          <ArrowRight />
        </Button>
      </footer>
      <p className="mt-4 max-w-[58ch] type-caption leading-relaxed text-muted-foreground">
        {interview.startedAt != null
          ? `${clock(Math.max(0, interview.duration * 60 - elapsed(interview)))} remaining`
          : interview.phase === "opening"
            ? "Your timer starts with the first technical question."
            : "Your timer starts when the interviewer begins speaking."}
      </p>
      {secondaryAction && (
        <div className="mt-6 border-t pt-5">{secondaryAction}</div>
      )}
    </section>
  );
}
