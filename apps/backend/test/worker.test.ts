import { expect, test, vi } from "vitest";
import { env } from "cloudflare:workers";
import { runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { app, config, createTestSession, interviews } from "./runtime";
import { profileLinkSource } from "../src/lib/profileSource";
import { openProviderSocket } from "../src/lib/deepgramSocket";

declare global {
  namespace Cloudflare {
    interface Env {
      LIVE_PROFILE_URL?: string;
      LEGACY_WORD_BASE64: string;
    }
  }
}

async function fixture() {
  const cookie = await createTestSession();
  const headers = {
    Cookie: `${cookie.name}=${cookie.value}`,
    Origin: config.FRONTEND_URL,
    "Content-Type": "application/json",
  };
  const created = await app.request("/api/interviews", {
    method: "POST",
    headers,
    body: JSON.stringify({
      role: "Backend",
      level: "Senior",
      topics: ["APIs"],
      duration: 10,
    }),
  });
  return { headers, interview: await created.json<{ id: string }>() };
}
function message(socket: WebSocket) {
  return new Promise<any>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("WebSocket message timed out")),
      3000,
    );
    socket.addEventListener(
      "message",
      (event) => {
        clearTimeout(timer);
        resolve(JSON.parse(String(event.data)));
      },
      { once: true },
    );
  });
}
test("the provider handshake deadline does not close an established Workers WebSocket", async () => {
  const pair = new WebSocketPair();
  const server = pair[1];
  server.accept();
  let signal: AbortSignal | undefined;
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (_input, init) => {
      signal = init?.signal ?? undefined;
      // Workers keeps the fetch abort signal attached to the upgraded connection.
      signal?.addEventListener("abort", () =>
        server.close(1011, "Fetch aborted"),
      );
      return new Response(null, { status: 101, webSocket: pair[0] });
    });
  let client: WebSocket | undefined;
  try {
    client = await openProviderSocket(
      new URL("wss://api.deepgram.com/v2/listen"),
      "fixture-key",
      20,
    );
    client.accept();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(signal?.aborted).toBe(false);
    const received = message(client);
    server.send(JSON.stringify({ type: "StillConnected" }));
    expect((await received).type).toBe("StillConnected");
  } finally {
    fetch.mockRestore();
    client?.close();
    server.close();
  }
});
test("a stalled provider handshake still times out with a useful error", async () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(
    (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Fetch aborted", "AbortError")),
        );
      }),
  );
  try {
    await expect(
      openProviderSocket(
        new URL("wss://api.deepgram.com/v2/listen"),
        "fixture-key",
        20,
      ),
    ).rejects.toThrow("Deepgram connection timed out");
  } finally {
    fetch.mockRestore();
  }
});
test("Cloudflare WebSockets route each interview to its own object and reject duplicate tabs", async () => {
  const first = await fixture();
  const open = () =>
    app.request(`/api/interviews/${first.interview.id}/ws`, {
      headers: { ...first.headers, Upgrade: "websocket" },
    });
  const response = await open();
  expect(response.status).toBe(101);
  const socket = response.webSocket!;
  const ready = message(socket);
  socket.accept();
  expect((await ready).interview.id).toBe(first.interview.id);
  const duplicate = (await open()).webSocket!;
  const rejected = message(duplicate);
  duplicate.accept();
  expect((await rejected).message).toContain("another tab");
  const other = await fixture();
  const otherResponse = await app.request(
    `/api/interviews/${other.interview.id}/ws`,
    { headers: { ...other.headers, Upgrade: "websocket" } },
  );
  const otherSocket = otherResponse.webSocket!;
  const otherReady = message(otherSocket);
  otherSocket.accept();
  expect((await otherReady).interview.id).toBe(other.interview.id);
  socket.close();
  otherSocket.close();
});
test("WebSocket upgrades require ownership and the configured browser origin", async () => {
  const { headers, interview } = await fixture();
  expect(
    (
      await app.request(`/api/interviews/${interview.id}/ws`, {
        headers: {
          ...headers,
          Origin: "https://evil.example",
          Upgrade: "websocket",
        },
      })
    ).status,
  ).toBe(403);
  const other = await createTestSession();
  expect(
    (
      await app.request(`/api/interviews/${interview.id}/ws`, {
        headers: {
          ...headers,
          Cookie: `${other.name}=${other.value}`,
          Upgrade: "websocket",
        },
      })
    ).status,
  ).toBe(404);
});
test("a persisted alarm finishes a disconnected interview and retains its feedback job", async () => {
  const { interview } = await fixture();
  await interviews.start(interview.id);
  const room = env.INTERVIEWS.getByName(interview.id);
  await runInDurableObject(room, async (_instance, state) => {
    await state.storage.put("interviewId", interview.id);
    await state.storage.put("deadline", Date.now() - 1);
    await state.storage.setAlarm(Date.now() + 60000);
  });
  await runDurableObjectAlarm(room);
  const saved = await interviews.get(interview.id);
  expect(saved?.status).toBe("completed");
  expect(saved?.endedAt).toBeGreaterThan(0);
  expect(saved?.feedbackStatus).toBe("failed"); // Missing provider config is recoverable via Retry feedback.
  await room.closeSession();
  expect(
    await runInDurableObject(room, (_instance, state) =>
      state.storage.getAlarm(),
    ),
  ).toBeNull();
});
test("ending a disconnected interview without feedback cancels its alarm and remains skipped on retry", async () => {
  const { headers, interview } = await fixture();
  await interviews.start(interview.id);
  await interviews.addMessage(
    interview.id,
    "user",
    "My saved answer.",
    "answer",
  );
  const room = env.INTERVIEWS.getByName(interview.id);
  await runInDurableObject(room, async (_instance, state) => {
    await state.storage.put("interviewId", interview.id);
    await state.storage.put("deadline", Date.now() + 60000);
    await state.storage.setAlarm(Date.now() + 60000);
  });
  const response = await app.request(`/api/interviews/${interview.id}/finish`, {
    method: "POST",
    headers,
    body: JSON.stringify({ generateFeedback: false }),
  });
  expect(response.status).toBe(200);
  const saved = await response.json<{
    status: string;
    feedbackStatus: string;
    feedback: unknown;
    messages: unknown[];
  }>();
  expect(saved.status).toBe("completed");
  expect(saved.feedbackStatus).toBe("skipped");
  expect(saved.feedback).toBeNull();
  expect(saved.messages).toHaveLength(1);
  await room.finish(interview.id);
  await room.queueFeedback(interview.id);
  expect((await interviews.get(interview.id))?.feedbackStatus).toBe("skipped");
  expect(await runDurableObjectAlarm(room)).toBe(false);
  expect(
    await runInDurableObject(room, (_instance, state) =>
      state.storage.get("deadline"),
    ),
  ).toBeUndefined();
  // Generating later requires a separate, explicit request.
  const generate = await app.request(
    `/api/interviews/${interview.id}/feedback`,
    { method: "POST", headers },
  );
  expect(generate.status).toBe(202);
  expect((await interviews.get(interview.id))?.feedbackStatus).toBe(
    "generating",
  );
  await runDurableObjectAlarm(room);
  // The one-millisecond alarm may already be running when the test helper
  // checks it. Await its result instead of racing the background handler.
  await expect
    .poll(async () => (await interviews.get(interview.id))?.feedbackStatus)
    .toBe("failed");
  await room.closeSession();
});
test("WebSocket completion can skip feedback and releases the persisted deadline", async () => {
  const { headers, interview } = await fixture();
  await interviews.start(interview.id);
  const response = await app.request(`/api/interviews/${interview.id}/ws`, {
    headers: { ...headers, Upgrade: "websocket" },
  });
  const socket = response.webSocket!;
  const ready = message(socket);
  socket.accept();
  await ready;
  socket.send(JSON.stringify({ type: "finish", generateFeedback: false }));
  let event;
  do {
    event = await message(socket);
  } while (event.type !== "finished");
  expect(event.generateFeedback).toBe(false);
  expect((await interviews.get(interview.id))?.feedbackStatus).toBe("skipped");
  const room = env.INTERVIEWS.getByName(interview.id);
  expect(await runDurableObjectAlarm(room)).toBe(false);
  socket.close();
  await room.closeSession();
});
test.skipIf(!env.LIVE_PROFILE_URL)(
  "the deployed-runtime profile transport reads a live public portfolio",
  async () => {
    const source = await profileLinkSource(
      env.LIVE_PROFILE_URL!,
      AbortSignal.timeout(20000),
    );
    expect(source.text.length).toBeGreaterThan(100);
  },
  25000,
);
