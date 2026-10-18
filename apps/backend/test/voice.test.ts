import { expect, test } from "bun:test";
import { DeepgramSocket } from "../src/lib/deepgramSocket";
test("Deepgram transport separates JSON control events from binary PCM audio", async () => {
  const server = Bun.serve({
    port: 0,
    fetch(request, server) {
      return server.upgrade(request)
        ? undefined
        : new Response("Upgrade required", { status: 400 });
    },
    websocket: {
      open(socket) {
        socket.send(JSON.stringify({ type: "Connected" }));
      },
      message(socket, message) {
        if (typeof message === "string") {
          socket.send(new Uint8Array([1, 0, 2, 0]));
          socket.send(JSON.stringify({ type: "Flushed" }));
        }
      },
    },
  });
  const binary: Uint8Array[] = [];
  let flushed!: () => void;
  const done = new Promise<void>((resolve) => {
    flushed = resolve;
  });
  let failed = false;
  const url = new URL(`ws://localhost:${server.port}`);
  const socket = new DeepgramSocket(
    url,
    "test-key",
    {
      json: (event) => {
        if (event.type === "Flushed") flushed();
      },
      audio: (data) => binary.push(data),
      error: () => {
        failed = true;
      },
    },
    (url) => new WebSocket(url),
  );
  try {
    await socket.connect();
    socket.send({ type: "Speak", text: "Test audio." });
    await done;
    expect(binary.map((data) => Array.from(data))).toEqual([[1, 0, 2, 0]]);
    expect(failed).toBe(false);
  } finally {
    socket.close();
    server.stop(true);
  }
});

test("speech waits for final audio metadata instead of closing at Flushed", async () => {
  const { TTSService } = await import("../src/lib/ttsService");
  const { env } = await import("../src/config");
  let configuredSpeed: number | undefined;
  const server = Bun.serve<{ timer: ReturnType<typeof setTimeout> | null }>({
    port: 0,
    fetch(request, server) {
      return server.upgrade(request, { data: { timer: null } })
        ? undefined
        : new Response("Upgrade required", { status: 400 });
    },
    websocket: {
      open(socket) {
        socket.send(JSON.stringify({ type: "Connected" }));
      },
      message(socket, message) {
        if (typeof message !== "string") return;
        const event = JSON.parse(message);
        if (event.type === "Configure") configuredSpeed = event.speed;
        if (event.type !== "Flush") return;
        socket.send(JSON.stringify({ type: "Flushed" }));
        socket.data.timer = setTimeout(() => {
          socket.send(new Uint8Array([1, 0, 2, 0]));
          socket.send(
            JSON.stringify({ type: "SpeechMetadata", audio_duration_ms: 100 }),
          );
        }, 30);
      },
      close(socket) {
        if (socket.data.timer) clearTimeout(socket.data.timer);
      },
    },
  });
  const previous = { url: env.DEEPGRAM_WS_URL, key: env.DEEPGRAM_API_KEY };
  env.DEEPGRAM_WS_URL = `ws://localhost:${server.port}`;
  env.DEEPGRAM_API_KEY = "fixture-key";
  const frames: number[][] = [];
  const speech = new TTSService((audio) => frames.push(Array.from(audio)));
  try {
    await speech.connect();
    speech.sendText("A question worth hearing.");
    await speech.flush();
    expect(configuredSpeed).toBe(1.2);
    expect(frames).toEqual([[1, 0, 2, 0]]);
  } finally {
    speech.close();
    server.stop(true);
    env.DEEPGRAM_WS_URL = previous.url;
    env.DEEPGRAM_API_KEY = previous.key;
  }
});
