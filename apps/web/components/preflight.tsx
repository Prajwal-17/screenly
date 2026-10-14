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
  onStart: (download: boolean) => void;
}) {
  const [download, setDownload] = useState(false);
  const [checked, setChecked] = useState(false);
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cleanup.current();
    };
  }, []);
  async function testMic() {
    cleanup.current();
    setTesting(true);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true },
      });
      if (!mounted.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const ctx = new AudioContext();
      await ctx.resume();
      if (!mounted.current) {
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
      setError(
        "Allow microphone access in your browser, then check your microphone again.",
      );
      setTesting(false);
    }
  }
  async function testSound() {
    const ctx = new AudioContext();
    await ctx.resume();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    oscillator.frequency.value = 440;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.25);
    oscillator.onended = () => void closeAudioContext(ctx);
  }
  return (
    <div className="surface preflight">
      <div className="eyebrow accent">
        {interview.status === "active" ? "Welcome back" : "Before we begin"}
      </div>
      <h2>
        {interview.status === "active"
          ? "Pick up the conversation."
          : "Get comfortable. Find your voice."}
      </h2>
      <p>
        {interview.status === "active"
          ? "Your transcript is saved. Resume the interview for the time remaining."
          : "We’ll start the clock when you’re ready. The interviewer will open with a question tailored to your focus."}
      </p>
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
      <div className="meter" aria-label="Microphone input level">
        <span style={{ width: `${level}%` }} />
      </div>
      <label className="row" style={{ fontSize: 12, color: "var(--subtle)" }}>
        <input
          type="checkbox"
          checked={download}
          onChange={(e) => setDownload(e.target.checked)}
          style={{ accentColor: "var(--accent)" }}
        />
        Download my microphone recording when I finish
      </label>
      <p style={{ fontSize: 11, margin: "10px 0 0" }}>
        Headphones help keep the conversation clear.
      </p>
      {capabilities && !capabilities.llm && (
        <div className="notice" style={{ marginTop: 20 }}>
          Set the backend’s LLM API key, base URL, and model, then restart it to
          enable the interviewer.
        </div>
      )}
      {capabilities && !capabilities.voice && (
        <div className="notice" style={{ marginTop: 15 }}>
          Set the backend’s Deepgram API key, then restart it to enable voice
          interviews.
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
            !capabilities?.voice
          }
          onClick={() => {
            cleanup.current();
            onStart(download);
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
