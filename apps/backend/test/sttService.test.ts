import { expect, test } from "bun:test";
import { readConfig } from "../src/config";
import { DeepgramConnectionError } from "../src/lib/deepgramSocket";
import { STTService } from "../src/lib/sttService";

const config = readConfig({
  BETTER_AUTH_SECRET: "test-secret-with-at-least-32-characters",
  DEEPGRAM_API_KEY: "test-key",
});
class ProviderSocket extends EventTarget {
  readyState = 1;
  binaryType = "arraybuffer";
  sent: unknown[] = [];
  accept() {
    queueMicrotask(() =>
      this.dispatchEvent(
        new MessageEvent("message", {
          data: JSON.stringify({ type: "Connected" }),
        }),
      ),
    );
  }
  send(data: unknown) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
  }
}

test("a transient handshake failure retries once and retains concurrent audio in order", async () => {
  let attempts = 0;
  const socket = new ProviderSocket();
  const errors: Error[] = [];
  const stt = new STTService(
    config,
    () => {},
    (e) => errors.push(e),
    [],
    () => {
      if (++attempts === 1) throw new DeepgramConnectionError("503");
      return socket as unknown as WebSocket;
    },
  );
  try {
    await Promise.all([
      stt.sendAudio(new Uint8Array([1, 2])),
      stt.sendAudio(new Uint8Array([3, 4])),
    ]);
    expect(attempts).toBe(2);
    expect(errors).toEqual([]);
    expect(socket.sent).toEqual([
      new Uint8Array([1, 2]),
      new Uint8Array([3, 4]),
    ]);
  } finally {
    stt.close();
  }
});

for (const code of ["401", "403", "400", "CONNECTION_FAILED"]) {
  test(`${code} failure reports once and bounds connection attempts`, async () => {
    let attempts = 0;
    const errors: Error[] = [];
    const stt = new STTService(
      config,
      () => {},
      (e) => errors.push(e),
      [],
      () => {
        attempts++;
        throw new DeepgramConnectionError(code);
      },
    );
    await stt.sendAudio(new Uint8Array([1, 2]));
    expect(attempts).toBe(code === "CONNECTION_FAILED" ? 2 : 1);
    expect(errors).toHaveLength(1);
    stt.close();
  });
}

test("a provider Error before Connected retries without reporting a premature voice error", async () => {
  let attempts = 0;
  const socket = new ProviderSocket();
  const errors: Error[] = [];
  const stt = new STTService(
    config,
    () => {},
    (e) => errors.push(e),
    [],
    () => {
      if (++attempts === 1) {
        const failed = new ProviderSocket();
        failed.accept = () =>
          queueMicrotask(() =>
            failed.dispatchEvent(
              new MessageEvent("message", {
                data: JSON.stringify({ type: "Error", code: "NET-0001" }),
              }),
            ),
          );
        return failed as unknown as WebSocket;
      }
      return socket as unknown as WebSocket;
    },
  );
  try {
    await stt.sendAudio(new Uint8Array([1, 2]));
    expect(attempts).toBe(2);
    expect(errors).toEqual([]);
    expect(socket.sent).toHaveLength(1);
  } finally {
    stt.close();
  }
});

test("closing during a handshake prevents retry and suppresses late errors", async () => {
  let attempts = 0;
  let rejectHandshake!: (error: Error) => void;
  const errors: Error[] = [];
  const stt = new STTService(
    config,
    () => {},
    (e) => errors.push(e),
    [],
    () => {
      attempts++;
      return new Promise<WebSocket>((_, reject) => {
        rejectHandshake = reject;
      });
    },
  );
  const sending = stt.sendAudio(new Uint8Array([1, 2]));
  stt.close();
  rejectHandshake(new DeepgramConnectionError());
  await sending;
  expect(attempts).toBe(1);
  expect(errors).toEqual([]);
});
