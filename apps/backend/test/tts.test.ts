import { expect, test, vi } from "vitest";
import { readConfig } from "../src/config";
import { TTSService } from "../src/lib/ttsService";

async function speechFixture() {
  const pair = new WebSocketPair();
  const server = pair[1];
  server.accept();
  const frames: Uint8Array[] = [];
  const speech = new TTSService(
    readConfig({
      BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
      DEEPGRAM_API_KEY: "fixture-key",
    }),
    (audio) => frames.push(audio),
    () => pair[0],
  );
  const connecting = speech.connect();
  server.send(JSON.stringify({ type: "Connected" }));
  await connecting;
  speech.sendText("A longer introduction and question.");
  async function deliver(data: string | ArrayBuffer) {
    const received = new Promise<void>((resolve) =>
      pair[0].addEventListener("message", () => resolve(), { once: true }),
    );
    server.send(data);
    await received;
  }
  return { speech, server, frames, deliver };
}

test("speech can stream beyond twenty seconds and waits for final metadata", async () => {
  const f = await speechFixture();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  try {
    let result = "pending";
    const flushing = f.speech.flush().then(
      () => {
        result = "complete";
      },
      () => {
        result = "failed";
      },
    );
    await f.deliver(JSON.stringify({ type: "Flushed" }));
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(8000);
      await f.deliver(new Uint8Array([1, 0, 2, 0]).buffer);
    }
    expect(f.frames).toHaveLength(3);
    expect(result).toBe("pending");
    await f.deliver(
      JSON.stringify({ type: "SpeechMetadata", audio_duration_ms: 24000 }),
    );
    await flushing;
    expect(result).toBe("complete");
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    f.speech.close();
    f.server.close();
    vi.useRealTimers();
  }
});

test("stalled speech times out after twenty seconds without audio", async () => {
  const f = await speechFixture();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  try {
    let error: unknown;
    const flushing = f.speech.flush().catch((failure) => {
      error = failure;
    });
    await vi.advanceTimersByTimeAsync(15000);
    await f.deliver(new Uint8Array([1, 0]).buffer);
    await vi.advanceTimersByTimeAsync(19999);
    expect(error).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await flushing;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("Speech stopped arriving");
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    f.speech.close();
    f.server.close();
    vi.useRealTimers();
  }
});

test("cancelling speech releases the pending flush and its deadline", async () => {
  const f = await speechFixture();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  try {
    const flushing = f.speech.flush();
    f.speech.close();
    await flushing;
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(20000);
  } finally {
    f.speech.close();
    f.server.close();
    vi.useRealTimers();
  }
});
