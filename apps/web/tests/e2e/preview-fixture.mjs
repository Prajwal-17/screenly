/* global Bun */
/** Loopback-only synthetic API for manual shared-preview review; never imported by the app. */
import { emptyProfile } from "@repo/shared";
import { feedback, interview, profile } from "./fixtures";
const now = Date.now();
let state = reset();
const sockets = new Set();
function reset() {
  return {
    authenticated: true,
    capabilities: { google: true, voice: true, llm: true, devLogin: false },
    profile: structuredClone(profile),
    interviews: [
      interview("completed", "completed"),
      { ...interview("active", "active"), startedAt: Date.now() - 180_000 },
      interview("draft", "draft"),
    ],
    failures: {},
    importMode: "success",
    events: [],
  };
}
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 4399,
  async fetch(req, server) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;
    const headers = {
      "access-control-allow-origin":
        req.headers.get("origin") ?? "http://127.0.0.1:3106",
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    };
    if (method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (path === "/__control" && method === "POST") {
      const command = await req.json();
      if (command.reset) state = reset();
      if (command.newProfile) {
        state.profile.status = "new";
        state.profile.details = emptyProfile("Alex Morgan");
        state.profile.onboarding = { step: 0, pendingImport: null };
      }
      if (command.failures) state.failures = command.failures;
      if (command.importMode) state.importMode = command.importMode;
      if (command.capabilities)
        Object.assign(state.capabilities, command.capabilities);
      if (command.event)
        for (const socket of sockets)
          socket.send(JSON.stringify(command.event));
      if (command.disconnect) for (const socket of sockets) socket.close();
      return Response.json(state, { headers });
    }
    if (path === "/__control") return Response.json(state, { headers });
    if (path === "/api/interviews/active/ws")
      return server.upgrade(req)
        ? undefined
        : new Response("Upgrade failed", { status: 400 });
    const key = `${method} ${path}`;
    if (state.failures[key])
      return Response.json(
        { error: state.failures[key] },
        { status: 503, headers },
      );
    let body = null;
    if (
      (method === "POST" || method === "PUT") &&
      req.headers.get("content-type")?.includes("application/json")
    )
      body = await req.json();
    let data;
    const id = path.split("/")[3];
    const detail = state.interviews.find((item) => item.id === id);
    if (path === "/api/auth/get-session") {
      const date = new Date(now).toISOString();
      data = state.authenticated
        ? {
            user: {
              id: "fixture-user",
              name: "Alex Morgan",
              email: "alex@example.com",
              emailVerified: true,
              image: null,
              createdAt: date,
              updatedAt: date,
            },
            session: {
              id: "fixture-session",
              userId: "fixture-user",
              token: "synthetic",
              expiresAt: new Date(now + 86400000).toISOString(),
              createdAt: date,
              updatedAt: date,
            },
          }
        : null;
    } else if (path === "/api/auth/sign-out") {
      state.authenticated = false;
      data = { success: true };
    } else if (path === "/api/capabilities") data = state.capabilities;
    else if (path === "/api/profile" && method === "GET") data = state.profile;
    else if (path === "/api/profile" && method === "PUT") {
      state.profile = {
        ...state.profile,
        details: body.details,
        onboarding: body.complete
          ? { step: 5, pendingImport: null }
          : (body.onboarding ?? state.profile.onboarding),
        updatedAt: Date.now(),
        status: body.complete
          ? "complete"
          : state.profile.status === "new"
            ? "draft"
            : state.profile.status,
      };
      data = state.profile;
    } else if (path === "/api/profile/skip") {
      state.profile.status = "skipped";
      data = state.profile;
    } else if (path === "/api/profile/import") {
      const mode = state.importMode;
      const stream = new ReadableStream({
        async start(controller) {
          const emit = (value) => {
            try {
              controller.enqueue(
                new TextEncoder().encode(JSON.stringify(value) + "\n"),
              );
            } catch {
              // A cancelled import closes the stream before its next event.
            }
          };
          emit({ type: "progress", stage: "extracting" });
          await Bun.sleep(mode === "pending" ? 30000 : 500);
          emit({ type: "progress", stage: "analyzing" });
          await Bun.sleep(500);
          emit(
            mode === "error" || mode === "empty"
              ? {
                  type: "error",
                  status: mode === "empty" ? 422 : 503,
                  error:
                    mode === "empty"
                      ? "No readable profile details were found."
                      : "Analysis unavailable. Retry or continue manually.",
                }
              : {
                  type: "result",
                  result: {
                    source: "Synthetic resume",
                    extractedCharacters: 80,
                    suggestions: {
                      name: "Imported Name",
                      headline: "Imported headline",
                      stack: ["Python"],
                    },
                  },
                },
          );
          try {
            controller.close();
          } catch {
            // The browser may already have cancelled the stream.
          }
        },
      });
      return new Response(stream, {
        headers: { ...headers, "content-type": "application/x-ndjson" },
      });
    } else if (path === "/api/interviews" && method === "POST") {
      data = { ...interview("created", "draft"), ...body };
      state.interviews.push(data);
    } else if (path === "/api/interviews") data = state.interviews;
    else if (detail && method === "DELETE") {
      state.interviews = state.interviews.filter((item) => item.id !== id);
      return new Response(null, { status: 204, headers });
    } else if (detail && path.endsWith("/finish")) {
      Object.assign(detail, {
        status: "completed",
        endedAt: Date.now(),
        feedbackStatus:
          body?.generateFeedback === false ? "skipped" : "pending",
      });
      data = detail;
    } else if (detail && path.endsWith("/feedback")) {
      detail.feedbackStatus = "ready";
      detail.feedback = structuredClone(feedback);
      data = { ok: true };
    } else if (detail) data = detail;
    else
      return Response.json(
        { error: "Interview not found or unhandled fixture request." },
        { status: 404, headers },
      );
    return Response.json(data, { headers });
  },
  websocket: {
    open(socket) {
      sockets.add(socket);
      const detail = state.interviews.find((item) => item.id === "active");
      socket.send(JSON.stringify({ type: "ready", interview: detail }));
      socket.send(JSON.stringify({ type: "status", status: "listening" }));
    },
    message(socket, message) {
      if (typeof message !== "string") return;
      const event = JSON.parse(message);
      state.events.push(event);
      const detail = state.interviews.find((item) => item.id === "active");
      if (event.type === "pause") {
        detail.pausedAt = event.paused ? Date.now() : null;
        socket.send(
          JSON.stringify({
            type: "pause-state",
            interview: detail,
            requestId: event.requestId,
          }),
        );
      }
      if (event.type === "finish") {
        Object.assign(detail, {
          status: "completed",
          endedAt: Date.now(),
          feedbackStatus:
            event.generateFeedback === false ? "skipped" : "pending",
        });
        socket.send(
          JSON.stringify({
            type: "finished",
            id: detail.id,
            generateFeedback: event.generateFeedback,
          }),
        );
      }
    },
    close(socket) {
      sockets.delete(socket);
    },
  },
});
console.log(`Synthetic fixture API listening on ${server.url}`);
