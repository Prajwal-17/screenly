import { Hono } from "hono";
import { upgradeWebSocket, websocket } from "hono/bun";
import { cors } from "hono/cors";
import { clientEventSchema, settingsSchema } from "@repo/shared";
import { auth } from "./auth";
import { capabilities, devLoginEnabled, env } from "./config";
import { interviews } from "./db/interviews";
import { generateFeedback } from "./lib/feedbackService";
import { InterviewSession } from "./lib/interviewSession";

export const app = new Hono<{ Variables: { userId: string } }>();
const sessions = new Map<string, InterviewSession>();
app.use(
  "/api/*",
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);
app.get("/", (c) =>
  c.json({ service: "ai-interviewer-backend", status: "ok" }),
);
app.get("/api/capabilities", (c) => c.json(capabilities));
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.use("/api/interviews/*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Sign in to continue." }, 401);
  c.set("userId", session.user.id);
  await next();
});
app.use("/api/interviews", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Sign in to continue." }, 401);
  c.set("userId", session.user.id);
  await next();
});
app.get("/api/interviews", (c) => c.json(interviews.list(c.get("userId"))));
app.post("/api/interviews", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Choose a role, experience level, topics, and duration." },
      400,
    );
  return c.json(interviews.create(c.get("userId"), parsed.data), 201);
});
app.use("/api/interviews/:id/*", async (c, next) => {
  if (!interviews.owned(c.req.param("id")!, c.get("userId")))
    return c.json({ error: "Interview not found." }, 404);
  await next();
});
app.get("/api/interviews/:id", (c) => {
  const owned = interviews.owned(c.req.param("id"), c.get("userId"));
  return owned
    ? c.json(interviews.get(owned.id))
    : c.json({ error: "Interview not found." }, 404);
});
app.delete("/api/interviews/:id", (c) => {
  const id = c.req.param("id");
  if (!interviews.owned(id, c.get("userId")))
    return c.json({ error: "Interview not found." }, 404);
  sessions.get(id)?.close();
  sessions.delete(id);
  interviews.remove(id, c.get("userId"));
  return c.body(null, 204);
});
app.post("/api/interviews/:id/finish", async (c) => {
  const id = c.req.param("id");
  if (interviews.get(id)?.status === "draft")
    return c.json({ error: "Start the interview first." }, 409);
  if (sessions.has(id)) await sessions.get(id)!.finish();
  else {
    interviews.finish(id);
    void generateFeedback(id);
  }
  return c.json(interviews.get(id));
});
app.post("/api/interviews/:id/feedback", (c) => {
  const id = c.req.param("id");
  if (interviews.get(id)?.status !== "completed")
    return c.json({ error: "Finish the interview first." }, 409);
  void generateFeedback(id);
  return c.json({ status: interviews.get(id)?.feedbackStatus }, 202);
});
app.use("/api/interviews/:id/ws", async (c, next) => {
  const origin = c.req.header("Origin");
  if (origin && origin !== env.FRONTEND_URL)
    return c.json({ error: "Origin is not allowed." }, 403);
  await next();
});
app.get(
  "/api/interviews/:id/ws",
  upgradeWebSocket((c) => {
    const id = c.req.param("id")!;
    let session: InterviewSession | null = null;
    return {
      onOpen(_event, socket) {
        if (sessions.has(id)) {
          socket.send(
            JSON.stringify({
              type: "error",
              scope: "session",
              message:
                "This interview is open in another tab. Close it and reconnect.",
            }),
          );
          socket.close(1008);
          return;
        }
        session = new InterviewSession(id, (event) => {
          if (socket.readyState === 1)
            socket.send(
              event instanceof Uint8Array
                ? Uint8Array.from(event)
                : JSON.stringify(event),
            );
        });
        sessions.set(id, session);
        session.ready();
      },
      async onMessage(event) {
        if (!session) return;
        if (typeof event.data === "string") {
          let data: unknown;
          try {
            data = JSON.parse(event.data);
          } catch {
            return;
          }
          const parsed = clientEventSchema.safeParse(data);
          if (parsed.success) await session.handle(parsed.data);
        } else {
          const audio =
            event.data instanceof Blob
              ? new Uint8Array(await event.data.arrayBuffer())
              : new Uint8Array(event.data);
          if (audio.byteLength <= 64000) session.audio(audio);
        }
      },
      onClose() {
        session?.close();
        if (sessions.get(id) === session) sessions.delete(id);
      },
      onError() {
        session?.close();
        if (sessions.get(id) === session) sessions.delete(id);
      },
    };
  }),
);
app.onError((error, c) => {
  console.error("[API]", error.message);
  return c.json({ error: "Something went wrong. Please try again." }, 500);
});
interviews.recoverFeedback();
export const server = Bun.serve({
  ...(devLoginEnabled ? { hostname: "127.0.0.1" } : {}),
  port: env.PORT,
  fetch: app.fetch,
  websocket,
});
console.log(`Interview backend ready on http://localhost:${server.port}`);
