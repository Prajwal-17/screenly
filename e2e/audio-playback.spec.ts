import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// Run the real player and its same-origin production worklet. Capture the actual
// rendered output, rather than asserting that a playback-rate property was set.
test("faster streamed speech retains pitch, with pause, interruption, and replay intact", async ({
  page,
}) => {
  test.setTimeout(60000);
  await mkdir(".impeccable/review", { recursive: true });
  execFileSync("bun", ["run", "--cwd", "apps/web", "build:audio"]);
  const harness = ".impeccable/review/audio-player-harness.js";
  execFileSync("bun", [
    "build",
    "apps/web/lib/audio-player.ts",
    "--target=browser",
    "--format=esm",
    `--outfile=${harness}`,
  ]);
  await page.route("**/__audio-player-test.js", async (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: await readFile(harness, "utf8"),
    }),
  );
  await page.route("**/__audio-harness.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<button id="start">Start audio test</button>',
    }),
  );
  await page.goto("/__audio-harness.html");
  await page.evaluate(async () => {
    const { AudioPlayer } = await import(
      `${location.origin}/__audio-player-test.js`
    );
    const target = window as Window & { audioResult: Promise<unknown> };
    document.querySelector<HTMLButtonElement>("#start")!.onclick = () => {
      target.audioResult = (async () => {
        let context: AudioContext;
        let analyser: AnalyserNode;
        const NativeContext = window.AudioContext;
        window.AudioContext = class extends NativeContext {
          constructor(options?: AudioContextOptions) {
            super(options);
            context = this;
          }
          createAnalyser() {
            return (analyser = super.createAnalyser());
          }
        };
        const player = new AudioPlayer();
        await player.unlock();
        window.AudioContext = NativeContext;
        const recorderSource = `class Recorder extends AudioWorkletProcessor {
          constructor() { super(); this.samples = new Float32Array(2048); this.index = 0;
            this.port.onmessage = () => { this.flush(); this.port.postMessage({ flushed: true }); }; }
          flush() { if (this.index) { const samples = this.samples.slice(0, this.index);
            this.port.postMessage({ samples }, [samples.buffer]); this.index = 0; } }
          process(inputs) { for (const sample of inputs[0]?.[0] ?? []) {
            this.samples[this.index++] = sample;
            if (this.index === this.samples.length) this.flush(); }
            return true; }
        } registerProcessor('test-recorder', Recorder);`;
        const moduleURL = URL.createObjectURL(
          new Blob([recorderSource], { type: "application/javascript" }),
        );
        await context!.audioWorklet.addModule(moduleURL);
        URL.revokeObjectURL(moduleURL);
        const recorder = new AudioWorkletNode(context!, "test-recorder");
        analyser!.connect(recorder);
        recorder.connect(context!.destination);
        let recorded: number[] = [];
        let flushed: (() => void) | undefined;
        recorder.port.onmessage = ({ data }) => {
          if (data.samples) recorded.push(...data.samples);
          if (data.flushed) flushed?.();
        };
        const flush = () =>
          new Promise<void>((resolve) => {
            flushed = resolve;
            recorder.port.postMessage("flush");
          });
        const wait = (ms: number) =>
          new Promise<void>((resolve) => setTimeout(resolve, ms));
        const tone = (seconds: number) =>
          Int16Array.from({ length: 24000 * seconds }, (_, i) => {
            const phase = (2 * Math.PI * 220 * i) / 24000;
            return Math.round(
              32767 * (0.45 * Math.sin(phase) + 0.2 * Math.sin(phase * 2)),
            );
          });
        const analyse = () => {
          const first = recorded.findIndex((value) => Math.abs(value) > 0.002);
          let last = recorded.length - 1;
          while (last > first && Math.abs(recorded[last]!) <= 0.002) last--;
          const start = first + Math.floor((last - first) / 3);
          const count = Math.min(6000, Math.floor((last - first) / 3));
          const correlations = new Float64Array(240);
          for (let offset = 24; offset < correlations.length; offset++) {
            for (let i = 0; i < count; i++)
              correlations[offset] +=
                recorded[start + i]! * recorded[start + i + offset]!;
          }
          const peak = Math.max(...correlations);
          let lag = correlations.indexOf(peak);
          for (let offset = 25; offset < correlations.length - 1; offset++) {
            if (
              correlations[offset]! >= peak * 0.98 &&
              correlations[offset]! >= correlations[offset - 1]! &&
              correlations[offset]! > correlations[offset + 1]!
            ) {
              lag = offset;
              break;
            }
          }
          return { pitch: 24000 / lag, duration: (last - first + 1) / 24000 };
        };
        const enqueue = (seconds: number, onStart: () => void) => {
          const input = tone(seconds);
          for (let i = 0; i < input.length; i += 317) {
            const packet = input.slice(i, i + 317);
            player.playPcm16(
              packet.buffer,
              24000,
              i === 0 ? onStart : undefined,
            );
          }
        };
        const rates = [];
        for (const rate of [1, 1.25, 1.5, 2]) {
          await flush();
          recorded = [];
          player.setPlaybackRate(rate);
          let starts = 0;
          enqueue(2, () => starts++);
          await player.drain();
          await flush();
          rates.push({ rate, starts, busy: player.busy, ...analyse() });
        }
        await flush();
        recorded = [];
        player.setPlaybackRate(1.25);
        let starts = 0;
        let began!: () => void;
        const playing = new Promise<void>((resolve) => {
          began = resolve;
        });
        enqueue(1.5, () => {
          starts++;
          began();
        });
        let drained = false;
        const done = player.drain().then(() => {
          drained = true;
        });
        await playing;
        await player.setPaused(true);
        const pausedAt = context!.currentTime;
        player.setPlaybackRate(2);
        await wait(120);
        const pause = {
          frozen: context!.currentTime === pausedAt,
          busy: player.busy,
          drained,
        };
        await player.setPaused(false);
        await done;
        await flush();
        const resumed = { starts, ...analyse() };
        await flush();
        recorded = [];
        let playingAgain!: () => void;
        const interruptedStart = new Promise<void>((resolve) => {
          playingAgain = resolve;
        });
        enqueue(2, playingAgain);
        const stopped = player.drain();
        await interruptedStart;
        player.stop();
        await stopped;
        await wait(100);
        await flush();
        const tail = recorded.slice(-480);
        const interrupted = {
          busy: player.busy,
          tailPeak: Math.max(...tail.map(Math.abs)),
        };
        await flush();
        recorded = [];
        let replayStarts = 0;
        enqueue(0.5, () => replayStarts++);
        await player.drain();
        await flush();
        const replay = { starts: replayStarts, ...analyse() };
        player.close();
        recorder.disconnect();
        recorder.port.close();
        return { rates, pause, resumed, interrupted, replay };
      })();
    };
  });
  await page.getByRole("button", { name: "Start audio test" }).click();
  const result = await page.evaluate(
    () =>
      (
        window as Window & {
          audioResult: Promise<{
            rates: {
              rate: number;
              starts: number;
              busy: boolean;
              pitch: number;
              duration: number;
            }[];
            pause: { frozen: boolean; busy: boolean; drained: boolean };
            resumed: { starts: number; pitch: number };
            interrupted: { busy: boolean; tailPeak: number };
            replay: { starts: number; pitch: number };
          }>;
        }
      ).audioResult,
  );
  for (const output of result.rates) {
    expect(output.starts).toBe(1);
    expect(output.busy).toBe(false);
    expect(Math.abs(output.pitch - 220)).toBeLessThan(3);
    expect(Math.abs(output.duration - 2 / output.rate)).toBeLessThan(0.08);
  }
  expect(result.pause).toEqual({ frozen: true, busy: true, drained: false });
  expect(result.resumed.starts).toBe(1);
  expect(Math.abs(result.resumed.pitch - 220)).toBeLessThan(3);
  expect(result.interrupted.busy).toBe(false);
  expect(result.interrupted.tailPeak).toBeLessThan(0.001);
  expect(result.replay.starts).toBe(1);
  expect(Math.abs(result.replay.pitch - 220)).toBeLessThan(3);
  await writeFile(
    ".impeccable/review/audio-playback-results.json",
    JSON.stringify(result, null, 2),
  );
  await test.info().attach("rendered-audio-measurements", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
});
