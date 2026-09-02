import { Hono } from "hono";
import { upgradeWebSocket, websocket } from "hono/bun";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { env } from "./config";
import { db } from "./db";
import { interviewSession } from "./db/schema";

const app = new Hono();

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
    let totalBytes = 0;
    let chunkCount = 0;

    return {
      onOpen(_event, socket) {
        if (!authSession) {
          socket.send(
            JSON.stringify({ type: "error", message: "Unauthorized" }),
          );
          socket.close(1008, "Unauthorized");
          return;
        }

        console.log(`[Audio WS] Connected: ${sessionId}`);
        socket.send(JSON.stringify({ type: "socket-ready", sessionId }));
      },

      async onMessage(event, socket) {
        if (typeof event.data === "string") {
          console.log(`[Audio WS] Control message: ${event.data}`);
          return;
        }

        const bytes = await getByteLength(event.data);
        totalBytes += bytes;
        chunkCount += 1;

        console.log(
          `[Audio WS] Chunk ${chunkCount}: ${bytes} bytes (${totalBytes} total)`,
        );

        socket.send(
          JSON.stringify({
            type: "audio-received",
            bytes,
            totalBytes,
            chunkCount,
          }),
        );
      },

      onClose() {
        console.log(
          `[Audio WS] Closed: ${sessionId}; ${chunkCount} chunks, ${totalBytes} bytes`,
        );
      },

      onError(event) {
        console.error(`[Audio WS] Error: ${sessionId}`, event);
      },
    };
  }),
);

async function getByteLength(data: Blob | ArrayBufferLike): Promise<number> {
  if (data instanceof Blob) return data.size;
  return data.byteLength;
}

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
  websocket,
});

console.log(`Hono server running at http://localhost:${server.port}`);

export { app, server };
