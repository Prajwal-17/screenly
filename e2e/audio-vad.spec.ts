import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";

test.beforeAll(async () => {
  execFileSync("bun", ["run", "--cwd", "apps/web", "build:audio"]);
  await mkdir(".impeccable/review", { recursive: true });
  execFileSync("bun", [
    "build",
    "apps/web/lib/speech-capture.ts",
    "--target=browser",
    "--format=esm",
    "--outfile=.impeccable/review/speech-capture-harness.js",
  ]);
});

test.beforeEach(async ({ page }) => {
  await page.route("**/vad-speech.wav", (route) =>
    route.fulfill({
      path: "e2e/fixtures/vad-speech.wav",
      contentType: "audio/wav",
    }),
  );
});

test("real ONNX model rejects silence and noise, streams speech, preserves boundaries and ends each turn", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const ctx = new AudioContext({ sampleRate: 16000 });
    const audio = await ctx.decodeAudioData(
      await (await fetch("/vad-speech.wav")).arrayBuffer(),
    );
    const voice = audio.getChannelData(0);
    await ctx.close();
    const worker = new Worker("/vad/vad-worker.js", { type: "module" });
    const waiters: (() => void)[] = [];
    let sentSamples = 0;
    let ends = 0;
    let starts = 0;
    let audioBeforeStart = false;
    let frameIndex = -1;
    let firstUpload = -1;
    const uploaded: number[] = [];
    let ready!: () => void;
    const loaded = new Promise<void>((resolve, reject) => {
      ready = resolve;
      worker.onerror = () => reject(new Error("VAD worker failed"));
    });
    worker.onmessage = ({ data }) => {
      if (data.type === "error") throw new Error("ONNX inference failed");
      if (data.type === "ready") ready();
      if (data.type === "processed") waiters.shift()?.();
      if (data.type === "speech-end") ends++;
      if (data.type === "speech-start") starts++;
      if (data.type === "audio") {
        if (starts === 0) audioBeforeStart = true;
        if (firstUpload < 0) firstUpload = frameIndex;
        sentSamples += data.samples.length;
        for (const sample of data.samples) uploaded.push(sample);
      }
    };
    worker.postMessage({ type: "init" });
    await loaded;
    const process = async (samples: Float32Array) => {
      for (let offset = 0; offset < samples.length; offset += 512) {
        const frame = new Float32Array(512);
        frame.set(samples.subarray(offset, offset + 512));
        frameIndex++;
        await new Promise<void>((resolve) => {
          waiters.push(resolve);
          worker.postMessage({ type: "frame", epoch: 0, frame }, [
            frame.buffer,
          ]);
        });
      }
    };
    const silence = new Float32Array(16000 * 10);
    await process(silence);
    const silenceBytes = sentSamples * 2;
    // Low-level noise and a short click should not open the speech gate.
    const noise = Float32Array.from(
      { length: 16000 * 2 },
      (_, i) => Math.sin(i * 137.7) * 0.005,
    );
    noise[500] = 0.5;
    await process(noise);
    const noiseBytes = sentSamples * 2;
    const voiceStartFrame = frameIndex + 1;
    await process(voice);
    const whileSpeaking = sentSamples;
    await process(silence);
    const afterTail = sentSamples;
    const firstEnds = ends;
    await process(silence);
    const afterLongSilence = sentSamples;
    await process(voice);
    await process(silence);
    worker.terminate();
    const firstNonzero = uploaded.findIndex((sample) => Math.abs(sample) > 10);
    return {
      silenceBytes,
      noiseBytes,
      whileSpeaking,
      afterTail,
      afterLongSilence,
      firstEnds,
      ends,
      starts,
      audioBeforeStart,
      firstNonzero,
      onsetLatencyMs: (firstUpload - voiceStartFrame) * 32,
      rawSeconds: (40 * 16000 + noise.length + voice.length * 2) / 16000,
      uploadedSeconds: sentSamples / 16000,
      voiceSeconds: voice.length / 16000,
    };
  });
  await testInfo.attach("speech-only-audio-metrics", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
  expect(result.silenceBytes).toBe(0);
  expect(result.noiseBytes).toBe(0);
  expect(result.whileSpeaking).toBeGreaterThan(
    16000 * result.voiceSeconds * 0.75,
  );
  expect(result.afterLongSilence).toBe(result.afterTail);
  expect(result.firstEnds).toBe(1);
  expect(result.ends).toBe(2);
  expect(result.starts).toBe(2);
  expect(result.audioBeforeStart).toBe(false);
  expect(result.onsetLatencyMs).toBeLessThan(500);
  expect(result.firstNonzero).toBeGreaterThanOrEqual(0);
  expect(result.uploadedSeconds).toBeLessThan(result.rawSeconds * 0.4);
});

test("capture mute discards buffered speech and detector failure stops capture without a continuous fallback", async ({
  page,
}) => {
  await page.route("**/__speech-capture.js", async (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: await readFile(
        ".impeccable/review/speech-capture-harness.js",
        "utf8",
      ),
    }),
  );
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { SpeechCapture } = await import(
      `${location.origin}/__speech-capture.js`
    );
    const ctx = new AudioContext({ sampleRate: 16000 });
    await ctx.resume();
    const buffer = await ctx.decodeAudioData(
      await (await fetch("/vad-speech.wav")).arrayBuffer(),
    );
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const destination = ctx.createMediaStreamDestination();
    source.connect(destination);
    navigator.mediaDevices.getUserMedia = async () => destination.stream;
    let uploaded = 0;
    let ended = 0;
    const capture = new SpeechCapture({
      audio: (samples: Int16Array) => {
        uploaded += samples.length;
      },
      end: () => {
        ended++;
      },
      level: () => {},
      error: () => {},
    });
    await capture.start();
    source.start();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const beforeMute = uploaded;
    capture.setEnabled(false);
    const atMute = uploaded;
    await new Promise((resolve) => setTimeout(resolve, 600));
    const afterMute = uploaded;
    capture.setEnabled(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const resumed = uploaded;
    capture.close();
    const atClose = uploaded;
    await new Promise((resolve) => setTimeout(resolve, 100));
    const stopped = destination.stream
      .getAudioTracks()
      .every((track) => track.readyState === "ended");
    source.stop();
    await ctx.close();
    return {
      beforeMute,
      atMute,
      afterMute,
      resumed,
      atClose,
      afterClose: uploaded,
      stopped,
      ended,
    };
  });
  expect(result.beforeMute).toBeGreaterThan(0);
  expect(result.afterMute).toBe(result.atMute);
  expect(result.resumed).toBeGreaterThan(result.afterMute);
  expect(result.afterClose).toBe(result.atClose);
  expect(result.stopped).toBe(true);
  expect(result.ended).toBeGreaterThan(0);
  await page.route("**/vad/silero_vad_v5.onnx", (route) => route.abort());
  const failed = await page.evaluate(async () => {
    const { SpeechCapture } = await import(
      `${location.origin}/__speech-capture.js`
    );
    const ctx = new AudioContext();
    const stream = ctx.createMediaStreamDestination().stream;
    navigator.mediaDevices.getUserMedia = async () => stream;
    let uploaded = 0;
    const capture = new SpeechCapture({
      audio: () => {
        uploaded++;
      },
      end: () => {},
      level: () => {},
      error: () => {},
    });
    let rejected = false;
    try {
      await capture.start();
    } catch {
      rejected = true;
    }
    capture.close();
    await ctx.close();
    return {
      rejected,
      uploaded,
      stopped: stream
        .getTracks()
        .every((track) => track.readyState === "ended"),
    };
  });
  expect(failed).toEqual({ rejected: true, uploaded: 0, stopped: true });
});
