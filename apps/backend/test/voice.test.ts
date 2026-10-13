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
