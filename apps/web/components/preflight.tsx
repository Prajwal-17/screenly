"use client";
import { useState, useRef, useEffect } from "react";
import { Mic, Volume2, Check, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
      className="mx-auto max-w-3xl overflow-hidden rounded-xl border bg-card"
      aria-labelledby="preflight-title"
    >
      <div className="border-b px-5 py-6 sm:px-8">
        <div className="mb-4 grid size-11 place-items-center rounded-xl bg-accent text-primary">
          <Mic className="size-5" aria-hidden="true" />
        </div>
        <h2 id="preflight-title" className="text-xl">
          {interview.status === "active" ? "Resume interview" : "Setup check"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {interview.status === "active"
            ? "Your transcript is saved. Resume with the time remaining."
            : "A quick sound check, then you’re ready. The clock starts when your interview begins."}
        </p>
      </div>
      <div className="space-y-6 p-5 sm:p-8">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium">Microphone & speakers</h3>
            {checked && (
              <span className="flex items-center gap-1 text-xs text-success">
                <Check className="size-3.5" />
                Checked
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
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
            <Button variant="outline" onClick={() => void testSound()}>
              <Volume2 />
              Test sound
            </Button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Progress
              role="meter"
              aria-label="Microphone input level"
              value={level}
              className="max-w-72"
            />
            <span className="text-[11px] text-muted-foreground">
              Input level
            </span>
          </div>
        </div>
        <div className="rounded-lg bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
          Find a quiet spot and speak as you would in a real interview. You can
          mute your microphone or interrupt the interviewer at any time.
        </div>
        <Field orientation="horizontal">
          <Checkbox
            id="download-recording"
            checked={download}
            onCheckedChange={(checked) => setDownload(checked === true)}
          />
          <FieldLabel
            htmlFor="download-recording"
            className="text-xs font-normal text-ink-secondary"
          >
            Download my microphone recording when I finish
          </FieldLabel>
        </Field>
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
        <Separator />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="max-w-[40ch] text-xs text-muted-foreground">
            {interview.duration} minutes · {interview.topics.join(", ")}
          </span>
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
      </div>
    </section>
  );
}
