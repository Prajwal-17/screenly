"use client";
import { useState, useRef, useEffect } from "react";
import { Mic, Volume2, Check, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { InlineAlert } from "@/components/common";
import { closeAudioContext } from "@/lib/audio-context";
import type { InterviewDetail, Capabilities } from "@repo/shared";
export function Preflight({
  interview,
  capabilities,
  disabled,
  starting,
  onStart,
}: {
  interview: InterviewDetail;
  capabilities?: Capabilities;
  disabled: boolean;
  starting: boolean;
  onStart: (download: boolean) => void;
}) {
  const [download, setDownload] = useState(false);
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
      className="mx-auto max-w-[720px] py-4 sm:py-8"
      aria-labelledby="preflight-title"
    >
      <div className="mb-8">
        <Mic
          className="mb-5 size-7 text-primary"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <h2
          id="preflight-title"
          className="text-[26px] leading-tight font-semibold tracking-[-0.03em]"
        >
          {interview.status === "active"
            ? "Ready to pick up where you left off?"
            : "A quick check before we begin."}
        </h2>
        <p className="mt-3 max-w-[55ch] text-sm leading-relaxed text-muted-foreground">
          {interview.status === "active"
            ? "Your conversation is saved. Check your audio, then continue with the time remaining."
            : "Find a quiet spot, check your sound, and make yourself comfortable. The clock starts when your interview begins."}
        </p>
      </div>
      <div className="divide-y border-y">
        <div className="py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Mic
                className="mt-1 size-[18px] text-muted-foreground"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-sm font-medium">Microphone</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {testing
                    ? "Speak a few words to check your input."
                    : checked
                      ? "Microphone check complete. You’re ready to speak."
                      : "Make sure your voice comes through clearly."}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={testing}
              onClick={() => void testMic()}
            >
              {testing ? (
                <Loader2 className="animate-spin" />
              ) : checked ? (
                <Check />
              ) : (
                <Mic />
              )}
              {testing
                ? "Listening for 4 seconds…"
                : checked
                  ? "Microphone checked"
                  : "Check microphone"}
            </Button>
          </div>
          <div className="mt-5 flex items-center gap-3 sm:pl-8">
            <Progress
              role="meter"
              aria-label="Microphone input level"
              value={level}
              className="h-1.5 max-w-60"
            />
            <span className="text-[11px] text-muted-foreground">
              Input level
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4 py-6">
          <div className="flex items-start gap-3">
            <Volume2
              className="mt-1 size-[18px] text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <h3 className="text-sm font-medium">Speakers</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Play a short tone to check your audio output.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void testSound()}>
            <Volume2 />
            Test sound
          </Button>
        </div>
      </div>
      <div className="py-6">
        <Field orientation="horizontal">
          <Checkbox
            id="download-recording"
            checked={download}
            onCheckedChange={(value) => setDownload(value === true)}
          />
          <div>
            <FieldLabel
              htmlFor="download-recording"
              className="text-[13px] font-normal text-ink-secondary"
            >
              Download my microphone recording when I finish
            </FieldLabel>
            <p className="mt-1 text-xs text-muted-foreground">
              Optional. Your read-only conversation is saved automatically.
            </p>
          </div>
        </Field>
      </div>
      <div className="space-y-3">
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
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
        <div>
          <p className="text-[13px] font-medium">
            {interview.duration} minutes
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {interview.topics.join(" · ")}
          </p>
        </div>
        <Button
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
            onStart(download);
          }}
        >
          {interview.status === "active"
            ? "Resume interview"
            : "Start interview"}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
