"use client";
import { useState, useRef, useEffect } from "react";
import { Mic, Volume2, Check, ArrowRight, Loader2 } from "lucide-react";
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
  onStart: (download: boolean, typed: boolean) => void;
}) {
  const [typed, setTyped] = useState(false);
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
      setError(
        "Allow microphone access in your browser, then retry, or choose typed answers.",
      );
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
    <div className="surface preflight">
      <h2>
        {interview.status === "active" ? "Resume interview" : "Setup check"}
      </h2>
      <p>
        {interview.status === "active"
          ? "Your transcript is saved. Resume with the time remaining."
          : "The clock starts when your interview begins."}
      </p>
      <fieldset
        className="choices"
        style={{ border: 0, padding: 0, marginBottom: 24 }}
      >
        <legend className="sr-only">Answer mode</legend>
        <label className="choice">
          <input
            type="radio"
            name="answer-mode"
            checked={!typed}
            onChange={() => setTyped(false)}
          />
          Voice answers
        </label>
        <label className="choice">
          <input
            type="radio"
            name="answer-mode"
            checked={typed}
            onChange={() => {
              checkVersion.current += 1;
              cleanup.current();
              setTesting(false);
              setError("");
              setTyped(true);
            }}
          />
          Typed answers
        </label>
      </fieldset>
      {!typed && (
        <>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <button
              className="button secondary"
              disabled={testing}
              onClick={() => void testMic()}
            >
              {testing ? (
                <Loader2 className="spin" size={16} />
              ) : checked ? (
                <Check size={16} />
              ) : (
                <Mic size={16} />
              )}{" "}
              {testing
                ? "Listening for 4 seconds…"
                : checked
                  ? "Microphone checked"
                  : "Check microphone"}
            </button>
            <button className="button ghost" onClick={() => void testSound()}>
              <Volume2 size={16} />
              Test sound
            </button>
          </div>
          <div
            className="meter"
            role="meter"
            aria-label="Microphone input level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(level)}
          >
            <span style={{ width: `${level}%` }} />
          </div>
          <label
            className="row"
            style={{ fontSize: 12, color: "var(--subtle)" }}
          >
            <input
              type="checkbox"
              checked={download}
              onChange={(e) => setDownload(e.target.checked)}
              style={{ accentColor: "var(--accent)" }}
            />
            Download my microphone recording when I finish
          </label>
        </>
      )}
      {capabilities && !capabilities.llm && (
        <div className="notice" style={{ marginTop: 20 }}>
          The interviewer is unavailable. Try again later.
        </div>
      )}
      {capabilities && !capabilities.voice && !typed && (
        <div className="notice" style={{ marginTop: 15 }}>
          Voice is unavailable. Choose typed answers to continue.
        </div>
      )}
      {error && (
        <div className="error" role="alert" style={{ marginTop: 15 }}>
          {error}
        </div>
      )}
      <div className="divider" />
      <div className="between" style={{ flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--subtle)" }}>
          {interview.duration} minutes · {interview.topics.join(", ")}
        </span>
        <button
          className="button"
          disabled={
            disabled ||
            starting ||
            testing ||
            !capabilities?.llm ||
            (!typed && !capabilities?.voice)
          }
          onClick={() => {
            checkVersion.current += 1;
            cleanup.current();
            onStart(download && !typed, typed);
          }}
        >
          {starting ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <ArrowRight size={16} />
          )}{" "}
          {interview.status === "active"
            ? "Resume interview"
            : "Start interview"}
        </button>
      </div>
    </div>
  );
}
