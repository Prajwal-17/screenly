import { expect, test } from "bun:test";
import { DeepgramSocket } from "../src/lib/deepgramSocket";
import { STTService } from "../src/lib/sttService";
import { readConfig } from "../src/config";
import { LLMService } from "../src/lib/llmService";
import type { InterviewDetail } from "@repo/shared";

test("live replies stream with their own model settings while feedback retains its model", async () => {
  const requests: Record<string, unknown>[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const report = {
    scoreScale: 10,
    summary: "No candidate answers yet.",
    overallScore: null,
    dimensions: [
      "Technical accuracy",
      "Depth & trade-offs",
      "Problem solving",
      "Communication",
    ].map((name) => ({
      name,
      score: null,
      explanation: "Insufficient evidence.",
    })),
    strengths: [],
    improvements: [],
    answers: [],
    nextSteps: ["Practice.", "Explain trade-offs.", "Use examples."],
  };
  const encoder = new TextEncoder();
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      const body = (await request.json()) as Record<string, unknown>;
      requests.push(body);
      if (!body.stream)
        return Response.json({
          choices: [{ message: { content: JSON.stringify(report) } }],
        });
      return new Response(
        new ReadableStream({
          async start(controller) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ choices: [{ delta: { content: "Explain " } }] })}\n\n`,
              ),
            );
            await gate;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ choices: [{ delta: { content: "React hooks." } }] })}\n\ndata: [DONE]\n\n`,
              ),
            );
            controller.close();
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    },
  });
  const base = {
    BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
    LLM_API_KEY: "fixture-key",
    LLM_BASE_URL: `http://localhost:${server.port}/v1`,
    LLM_MODEL: "report-model",
  };
  const config = readConfig({
    ...base,
    LLM_INTERVIEW_MODEL: "voice-model",
    LLM_INTERVIEW_REASONING_EFFORT: "low",
    LLM_INTERVIEW_MAX_TOKENS: "256",
  });
  const interview: InterviewDetail = {
    id: "voice-model-fixture",
    role: "Frontend",
    level: "Senior",
    topics: ["React"],
    duration: 10,
    status: "active",
    createdAt: 1,
    startedAt: null,
    endedAt: null,
    feedbackStatus: "pending",
    feedback: null,
    feedbackModel: null,
    messages: [],
  };
  const service = new LLMService(config);
  try {
    const stream = service.generateReply(
      interview,
      new AbortController().signal,
    );
    expect((await stream.next()).value).toBe("Explain "); // Arrives while the response tail is held.
    expect(requests[0]).toMatchObject({
      model: "voice-model",
      reasoning_effort: "low",
      max_tokens: 256,
      stream: true,
    });
    release();
    expect((await stream.next()).value).toBe("React hooks.");
    expect((await stream.next()).done).toBe(true);
    await service.evaluate(interview);
    expect(requests[1]!.model).toBe("report-model");
    expect(requests[1]).not.toHaveProperty("reasoning_effort");
    expect(requests[1]).not.toHaveProperty("max_tokens");
    const legacy = new LLMService(readConfig(base));
    const defaultTokens: string[] = [];
    for await (const token of legacy.generateReply(
      {
        ...interview,
        messages: [
          {
            id: "q",
            role: "assistant",
            content: "How would you cache this?",
            status: "complete",
            createdAt: 1,
          },
          {
            id: "a1",
            role: "user",
            content: "I would cache the response.",
            status: "complete",
            createdAt: 2,
          },
          {
            id: "a2",
            role: "user",
            content: "Actually, invalidate on writes.",
            status: "complete",
            createdAt: 3,
          },
          {
            id: "partial",
            role: "assistant",
            content: "What about",
            status: "interrupted",
            createdAt: 4,
          },
          {
            id: "a3",
            role: "user",
            content: "Let me add something.",
            status: "complete",
            createdAt: 5,
          },
          {
            id: "a4",
            role: "user",
            content: "A short TTL helps too.",
            status: "complete",
            createdAt: 6,
          },
        ],
      },
      new AbortController().signal,
    ))
      defaultTokens.push(token);
    expect(defaultTokens.join("")).toBe("Explain React hooks.");
    expect(requests[2]!.model).toBe("report-model");
    expect(requests[2]).not.toHaveProperty("reasoning_effort");
    expect(requests[2]).not.toHaveProperty("max_tokens");
    expect((requests[2]!.messages as unknown[]).slice(1)).toEqual([
      { role: "assistant", content: "How would you cache this?" },
      {
        role: "user",
        content:
          "I would cache the response.\n\nActually, invalidate on writes.",
      },
      {
        role: "assistant",
        content: "What about [This reply was interrupted.]",
      },
      {
        role: "user",
        content: "Let me add something.\n\nA short TTL helps too.",
      },
    ]);
  } finally {
    release();
    server.stop(true);
  }
});

test("turn timeout defaults to three seconds and rejects invalid audio timing", () => {
  const base = {
    BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
  };
  expect(readConfig(base).DEEPGRAM_EOT_TIMEOUT_MS).toBe(3000);
  for (const value of [0, 499, 60001, 1000.5])
    expect(() =>
      readConfig({ ...base, DEEPGRAM_EOT_TIMEOUT_MS: value }),
    ).toThrow();
});

test("transcription keeps the capture format and adds only selected-topic keyterms", async () => {
  let requestURL: URL | undefined;
  let samples: number[] = [];
  let resolveAudio!: () => void;
  let resolveTranscript!: () => void;
  const received = new Promise<void>((resolve) => {
    resolveAudio = resolve;
  });
  const transcribed = new Promise<void>((resolve) => {
    resolveTranscript = resolve;
  });
  const server = Bun.serve({
    port: 0,
    fetch(request, server) {
      requestURL = new URL(request.url);
      return server.upgrade(request)
        ? undefined
        : new Response("Upgrade required", { status: 400 });
    },
    websocket: {
      open(socket) {
        socket.send(JSON.stringify({ type: "Connected" }));
      },
      message(socket, data) {
        if (typeof data === "string") return;
        samples = Array.from(data);
        socket.send(
          JSON.stringify({
            type: "TurnInfo",
            event: "Update",
            transcript: "React useEffect",
            turn_index: 0,
          }),
        );
        resolveAudio();
      },
    },
  });
  const env = readConfig({
    BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
    DEEPGRAM_API_KEY: "fixture-key",
    DEEPGRAM_WS_URL: `ws://localhost:${server.port}`,
    DEEPGRAM_EOT_TIMEOUT_MS: 7000,
  });
  const words: string[] = [];
  const stt = new STTService(
    env,
    (turn) => {
      words.push(turn.transcript);
      resolveTranscript();
    },
    () => {},
    ["React", "TypeScript"],
    (url) => new WebSocket(url.toString()),
  );
  try {
    await stt.connect();
    expect(requestURL!.pathname).toBe("/v2/listen");
    expect(requestURL!.searchParams.get("encoding")).toBe("linear16");
    expect(requestURL!.searchParams.get("sample_rate")).toBe("16000");
    expect(requestURL!.searchParams.get("eot_timeout_ms")).toBe("7000");
    expect(requestURL!.searchParams.get("eager_eot_threshold")).toBe("0.5");
    const keyterms = requestURL!.searchParams.getAll("keyterm");
    expect(keyterms).toContain("useEffect");
    expect(keyterms).toContain("TypeScript");
    expect(keyterms).not.toContain("PostgreSQL");
    expect(new Set(keyterms).size).toBe(keyterms.length);
    stt.sendAudio(new Uint8Array([1, 0, 2, 0]));
    await received;
    await transcribed;
    expect(samples).toEqual([1, 0, 2, 0]);
    expect(words).toEqual(["React useEffect"]);
  } finally {
    stt.close();
    server.stop(true);
  }
});
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
    (url) => new WebSocket(url.toString()),
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

test("speech-only transcription finalizes without silent PCM and resumes after idle with monotonic turn IDs", async () => {
  let connections = 0;
  let closedConnections = 0;
  const audio: number[][] = [];
  const controls: string[] = [];
  const turns: { event: string; index: number }[] = [];
  const errors: string[] = [];
  const server = Bun.serve({
    port: 0,
    fetch(request, server) {
      return server.upgrade(request)
        ? undefined
        : new Response("Upgrade required", { status: 400 });
    },
    websocket: {
      open(socket) {
        connections++;
        socket.send(JSON.stringify({ type: "Connected" }));
      },
      message(socket, message) {
        if (typeof message === "string") {
          const { type } = JSON.parse(message);
          controls.push(type);
          if (type === "ForceEndTurn")
            socket.send(
              JSON.stringify({
                type: "TurnInfo",
                event: "EndOfTurn",
                turn_index: 0,
                transcript: "Index the customer identifier.",
              }),
            );
          return;
        }
        audio.push(Array.from(message));
        socket.send(
          JSON.stringify({
            type: "TurnInfo",
            event: "Update",
            turn_index: 0,
            transcript: "Index the customer identifier.",
          }),
        );
      },
      close() {
        closedConnections++;
      },
    },
  });
  const config = readConfig({
    BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
    DEEPGRAM_API_KEY: "fixture-key",
    DEEPGRAM_WS_URL: `ws://localhost:${server.port}`,
  });
  const stt = new STTService(
    config,
    (turn) => turns.push({ event: turn.event, index: turn.turn_index }),
    (error) => errors.push(error.message),
    [],
    (url) => new WebSocket(url.toString()),
  );
  const until = async (condition: () => boolean) => {
    const deadline = Date.now() + 7000;
    while (!condition()) {
      if (Date.now() > deadline) throw new Error("Provider fixture timed out");
      await Bun.sleep(10);
    }
  };
  try {
    await stt.connect();
    await until(() => closedConnections === 1); // Initial warm connection receives no audio.
    expect(audio).toHaveLength(0);
    await Promise.all([
      stt.sendAudio(new Uint8Array([1, 0, 2, 0])),
      stt.sendAudio(new Uint8Array([3, 0, 4, 0])),
    ]);
    stt.endSpeech();
    await until(() => turns.some((turn) => turn.event === "EndOfTurn"));
    expect(connections).toBe(2); // Concurrent packets share one handshake.
    expect(audio).toEqual([
      [1, 0, 2, 0],
      [3, 0, 4, 0],
    ]);
    await until(() => closedConnections === 2);
    expect(audio).toHaveLength(2); // No zero-filled keepalive frames while idle.
    await stt.sendAudio(new Uint8Array([5, 0, 6, 0]));
    stt.endSpeech();
    await until(
      () => turns.filter((turn) => turn.event === "EndOfTurn").length === 2,
    );
    expect(
      turns
        .filter((turn) => turn.event === "EndOfTurn")
        .map((turn) => turn.index),
    ).toEqual([0, 1]);
    expect(audio).toEqual([
      [1, 0, 2, 0],
      [3, 0, 4, 0],
      [5, 0, 6, 0],
    ]);
    expect(controls.filter((type) => type === "ForceEndTurn")).toHaveLength(2);
    expect(controls).not.toContain("KeepAlive");
    expect(errors).toEqual([]);
  } finally {
    stt.close();
    server.stop(true);
  }
}, 20000);

test("speech waits for final audio metadata instead of closing at Flushed", async () => {
  const { TTSService } = await import("../src/lib/ttsService");
  const { readConfig } = await import("../src/config");
  const env = readConfig({
    BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
  });
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
  const speech = new TTSService(
    env,
    (audio) => frames.push(Array.from(audio)),
    (url) => new WebSocket(url.toString()),
  );
  try {
    await speech.connect();
    speech.sendText("A question worth hearing.");
    await speech.flush();
    expect(configuredSpeed).toBe(env.DEEPGRAM_TTS_SPEED);
    expect(frames).toEqual([[1, 0, 2, 0]]);
  } finally {
    speech.close();
    server.stop(true);
    env.DEEPGRAM_WS_URL = previous.url;
    env.DEEPGRAM_API_KEY = previous.key;
  }
});
