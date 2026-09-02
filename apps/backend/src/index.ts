import { Hono } from "hono";
import { upgradeWebSocket, websocket } from "hono/bun";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { env } from "./config";
import { systemPrompt } from "./constants";
import { db } from "./db";
import { interviewSession } from "./db/schema";
import { InterviewSession } from "./lib/interviewSession";

const app = new Hono();
const sessions = new Map<string, InterviewSession>(); // sessionId,InterviewSession

const localCors = cors({
  origin: env.FRONTEND_URL,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "OPTIONS"],
  credentials: true,
});

app.use("/api/auth/*", localCors);
app.use("/api/session", localCors);

app.get("/", (c) => {
  return c.json({ service: "ai-interviewer-backend", status: "ok" });
});

app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.post("/api/session", async (c) => {
  const authSession = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!authSession) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const id = crypto.randomUUID();

  db.insert(interviewSession)
    .values({
      id,
      userId: authSession.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .run();

  return c.json({ id }, 201);
});

app.get(
  "/api/sessions/:id/ws",
  upgradeWebSocket(async (c) => {
    const sessionId = c.req.param("id") ?? "unknown";
    const authSession = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    return {
      onOpen(_event, socket) {
        if (!authSession) {
          socket.send(
            JSON.stringify({ type: "error", message: "Unauthorized" }),
          );
          socket.close(1008, "Unauthorized");
          return;
        }

        const sessionExists = sessions.get(sessionId);
        if (!sessionExists) {
          const session = new InterviewSession(socket, sessionId);
          sessions.set(sessionId, session);
          session.messages.set(sessionId, [
            {
              role: "developer",
              content: systemPrompt,
            },
          ]);
        }

        console.log(`[Audio WS] Connected: ${sessionId}`);
        socket.send(JSON.stringify({ type: "socket-ready", sessionId }));
      },

      async onMessage(event, socket) {
        const session = sessions.get(sessionId);
        if (!session) return;

        await session.handleMessage(event);
      },

      onClose() {
        const session = sessions.get(sessionId);
        if (session) {
          session.close();
          sessions.delete(sessionId);
        }
      },

      onError(event) {
        console.error(`[Audio WS] Error: ${sessionId}`, event);
      },
    };
  }),
);

// async function getByteLength(data: Blob | ArrayBufferLike): Promise<number> {
//   if (data instanceof Blob) return data.size;
//   return data.byteLength;
// }

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
  websocket,
});

console.log(`Hono server running at http://localhost:${server.port}`);

export { app, server };
