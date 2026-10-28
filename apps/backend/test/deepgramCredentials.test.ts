import { expect, spyOn, test } from "bun:test";
import { getCapabilities, readConfig } from "../src/config";
import {
  DeepgramCredentials,
  type CredentialRequest,
} from "../src/lib/deepgramCredentials";
import { DeepgramSocket, type SocketFactory } from "../src/lib/deepgramSocket";
import { STTService } from "../src/lib/sttService";
import { TTSService } from "../src/lib/ttsService";

class MemoryStorage {
  data = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | undefined> {
    return structuredClone(this.data.get(key)) as T | undefined;
  }
  async put<T>(key: string, value: T): Promise<void> {
    this.data.set(key, structuredClone(value));
  }
}

function fixture() {
  const config = readConfig({
    BETTER_AUTH_SECRET: "test-secret-with-at-least-32-characters",
    DEEPGRAM_API_KEY: "management-secret",
    DEEPGRAM_PROJECT_ID: "project-one",
  });
  const storage = new MemoryStorage();
  const calls: { url: string; options?: RequestInit }[] = [];
  let time = Date.now();
  let count = 0;
  let deleteStatus = 200;
  let createStatus = 200;
  const request: CredentialRequest = async (url, options) => {
    calls.push({ url: String(url), options });
    if (options?.method === "DELETE")
      return new Response("{}", { status: deleteStatus });
    return Response.json(
      { api_key_id: `key-id-${++count}`, key: `interview-secret-${count}` },
      { status: createStatus },
    );
  };
  let scheduled: number | null = null;
  function restore() {
    const credentials = new DeepgramCredentials(
      config,
      storage,
      async () => {
        scheduled = await credentials.nextAlarm();
      },
      request,
      () => time,
    );
    return credentials;
  }
  return {
    config,
    storage,
    calls,
    request,
    restore,
    credentials: restore(),
    advance: (ms: number) => {
      time += ms;
    },
    setDeleteStatus: (status: number) => {
      deleteStatus = status;
    },
    setCreateStatus: (status: number) => {
      createStatus = status;
    },
    now: () => time,
    scheduled: () => scheduled,
  };
}

test("concurrent speech requests share one expiring, speech-only interview key", async () => {
  const f = fixture();
  expect(
    await Promise.all([
      f.credentials.get("interview-one"),
      f.credentials.get("interview-one"),
    ]),
  ).toEqual(["interview-secret-1", "interview-secret-1"]);
  expect(f.calls).toHaveLength(1);
  const call = f.calls[0]!;
  expect(call.url).toBe(
    "https://api.deepgram.com/v1/projects/project-one/keys",
  );
  expect(new Headers(call.options?.headers).get("Authorization")).toBe(
    "Token management-secret",
  );
  expect(JSON.parse(String(call.options?.body))).toEqual({
    comment: "Screenly interview interview-one",
    scopes: ["usage:write"],
    expiration_date: new Date(f.now() + 3600000).toISOString(),
  });
  expect(f.scheduled()).toBe(f.now() + 3600000);
});

test("a reconnect or object restart reuses its saved key", async () => {
  const f = fixture();
  const first = await f.credentials.get("interview-one");
  expect(await f.restore().get("interview-one")).toBe(first);
  expect(f.calls).toHaveLength(1);
});

test("the default transport calls native fetch without a credential-manager receiver", async () => {
  const f = fixture();
  const methods: string[] = [];
  const nativeFetch = spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(
      async function (this: unknown, ...args: Parameters<typeof fetch>) {
        // Match workerd's native receiver check. Bun's built-in fetch accepts
        // arbitrary receivers, so a normal mocked HTTP response misses this bug.
        if (this !== undefined && this !== globalThis)
          throw new TypeError("Illegal invocation: incorrect this reference");
        const options = args[1];
        methods.push(options?.method ?? "GET");
        return options?.method === "DELETE"
          ? new Response(null, { status: 204 })
          : Response.json({
              api_key_id: "default-key-id",
              key: "default-secret",
            });
      },
      { preconnect: fetch.preconnect },
    ),
  );
  try {
    // Deliberately omit the injected transport used by the other fixtures.
    const credentials = new DeepgramCredentials(
      f.config,
      f.storage,
      async () => {},
    );
    expect(await credentials.get("interview-one")).toBe("default-secret");
    await credentials.close();
    expect(methods).toEqual(["POST", "DELETE"]);
    expect(JSON.stringify([...f.storage.data])).not.toContain("default-secret");
  } finally {
    nativeFetch.mockRestore();
  }
});

test("different interview objects get different keys", async () => {
  const f = fixture();
  const other = new DeepgramCredentials(
    f.config,
    new MemoryStorage(),
    async () => {},
    f.request,
  );
  const first = await f.credentials.get("interview-one");
  expect(await other.get("interview-two")).not.toBe(first);
  expect(f.calls).toHaveLength(2);
});

test("completion revokes the key, erases its secret, and prevents further issuance", async () => {
  const f = fixture();
  await f.credentials.get("interview-one");
  await f.credentials.close();
  expect(f.calls[1]?.options?.method).toBe("DELETE");
  expect(f.calls[1]?.url).toEndWith("/projects/project-one/keys/key-id-1");
  expect(f.scheduled()).toBeNull();
  expect(JSON.stringify([...f.storage.data])).not.toContain("interview-secret");
  await expect(f.restore().get("interview-one")).rejects.toMatchObject({
    code: "SESSION_CLOSED",
  });
  await f.credentials.close();
  expect(f.calls).toHaveLength(2);
});

test("failed revocation survives a restart and retries without an interview record", async () => {
  const f = fixture();
  await f.credentials.get("interview-one");
  f.setDeleteStatus(503);
  await f.credentials.close();
  expect(f.scheduled()).toBe(f.now() + 60000);
  expect(JSON.stringify([...f.storage.data])).not.toContain("interview-secret");
  const restored = f.restore();
  await restored.alarm();
  expect(f.calls).toHaveLength(2); // Not due yet.
  f.advance(60000);
  f.setDeleteStatus(200);
  await restored.alarm();
  expect(f.calls).toHaveLength(3);
  expect(f.scheduled()).toBeNull();
  await expect(restored.get("interview-one")).rejects.toMatchObject({
    code: "SESSION_CLOSED",
  });
});

test("already deleted keys count as successful revocation", async () => {
  const f = fixture();
  await f.credentials.get("interview-one");
  f.setDeleteStatus(404);
  await f.credentials.close();
  expect(f.scheduled()).toBeNull();
});

test("provider expiry bounds cleanup retries during a prolonged outage", async () => {
  const f = fixture();
  await f.credentials.get("interview-one");
  f.setDeleteStatus(503);
  await f.credentials.close();
  expect(f.scheduled()).not.toBeNull();
  f.advance(3600000);
  await f.restore().alarm();
  expect(f.scheduled()).toBeNull();
  expect(JSON.stringify([...f.storage.data])).not.toContain("interview-secret");
  await expect(f.restore().get("interview-one")).rejects.toMatchObject({
    code: "SESSION_CLOSED",
  });
});

test("expiry cleans up an abandoned key and resumed voice gets a replacement", async () => {
  const f = fixture();
  await f.credentials.get("interview-one");
  f.advance(3600000);
  await f.restore().alarm();
  expect(f.calls[1]?.options?.method).toBe("DELETE");
  expect(await f.restore().get("interview-one")).toBe("interview-secret-2");
  expect(f.calls).toHaveLength(3);
});

test("near-expiry keys rotate on demand without waiting for the alarm", async () => {
  const f = fixture();
  await f.credentials.get("interview-one");
  f.advance(3600000 - 15000);
  expect(await f.credentials.get("interview-one")).toBe("interview-secret-2");
  expect(f.calls.map((call) => call.options?.method)).toEqual([
    "POST",
    "DELETE",
    "POST",
  ]);
});

test("finish during key creation waits for creation and revokes the new key", async () => {
  const f = fixture();
  const started = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const credentials = new DeepgramCredentials(
    f.config,
    f.storage,
    async () => {},
    async (url, init) => {
      if (init?.method === "POST") {
        started.resolve();
        await release.promise;
      }
      return f.request(url, init);
    },
  );
  const opening = credentials.get("interview-one");
  await started.promise;
  const closing = credentials.close();
  release.resolve();
  await Promise.all([opening, closing]);
  expect(f.calls.map((call) => call.options?.method)).toEqual([
    "POST",
    "DELETE",
  ]);
  await expect(credentials.get("interview-one")).rejects.toMatchObject({
    code: "SESSION_CLOSED",
  });
});

class ProviderSocket extends EventTarget {
  readyState = 1;
  binaryType = "arraybuffer";
  accept() {
    queueMicrotask(() =>
      this.dispatchEvent(
        new MessageEvent("message", {
          data: JSON.stringify({ type: "Connected" }),
        }),
      ),
    );
  }
  send() {}
  close() {
    this.readyState = 3;
  }
}

test("STT and TTS authenticate with the interview key and never the management key", async () => {
  const f = fixture();
  const keys: string[] = [];
  const makeSocket: SocketFactory = (_url, key) => {
    keys.push(key);
    return new ProviderSocket() as unknown as WebSocket;
  };
  const key = () => f.credentials.get("interview-one");
  const stt = new STTService(
    f.config,
    () => {},
    () => {},
    [],
    makeSocket,
    key,
  );
  const tts = new TTSService(f.config, () => {}, makeSocket, key);
  try {
    await Promise.all([stt.connect(), tts.connect()]);
    expect(keys).toEqual(["interview-secret-1", "interview-secret-1"]);
    expect(f.calls).toHaveLength(1);
  } finally {
    stt.close();
    tts.close();
  }
});

test("management failures never fall back to the root key or leak provider bodies", async () => {
  const f = fixture();
  f.setCreateStatus(403);
  let opened = false;
  const socket = new DeepgramSocket(
    new URL("wss://api.deepgram.com/v2/listen"),
    () => f.credentials.get("interview-one"),
    { json: () => {}, error: () => {} },
    () => {
      opened = true;
      throw new Error("Unexpected socket");
    },
  );
  await expect(socket.connect()).rejects.toMatchObject({
    code: "KEY_MANAGEMENT",
  });
  expect(opened).toBe(false);
  expect(f.scheduled()).toBeNull();
  f.setCreateStatus(200);
  expect(await f.credentials.get("interview-one")).toBe("interview-secret-2");
});

test("missing project configuration disables voice and cannot issue keys", async () => {
  const f = fixture();
  const config = { ...f.config, DEEPGRAM_PROJECT_ID: undefined };
  expect(getCapabilities(config).voice).toBe(false);
  expect(getCapabilities(f.config).voice).toBe(true);
  const credentials = new DeepgramCredentials(
    config,
    f.storage,
    async () => {},
    f.request,
  );
  await expect(credentials.get("interview-one")).rejects.toMatchObject({
    code: "MISSING_PROJECT",
  });
  expect(f.calls).toHaveLength(0);
});
