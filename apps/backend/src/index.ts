import { Hono } from "hono";
import { cors } from "hono/cors";
import { v4 as uuid } from "uuid";
import { interviewSession } from "./db/schema";
import { InterviewSessionDO } from "./lib/interview-session-do";
import { authMiddleware, requireAuth } from "./middleware/authMiddleware";
import { dbMiddleware } from "./middleware/dbMiddleware";
import type { CF_Bindings, HonoVariables } from "./types/types";

const app = new Hono<{
  Bindings: CF_Bindings;
  Variables: HonoVariables;
}>();

app.use(
  "/api/*",
  cors({
    origin: "http://localhost:3000",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

app.use("*", dbMiddleware);
app.use("*", authMiddleware);

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  const auth = c.get("auth");
  return auth.handler(c.req.raw);
});

app.get("/", async (c) => {
  return c.text("Hello Hono!");
});

app.get("/api/protected", requireAuth, async (c) => {
  return c.text("Verified");
});

app.post("/api/session", requireAuth, async (c) => {
  const db = c.var.db;
  const user = c.var.user!;

  const sessionId = uuid();
  await db.insert(interviewSession).values({
    id: sessionId,
    userId: user.id,
  });

  return c.json({ id: sessionId }, 201);
});

app.get("/api/sessions/:id/ws", requireAuth, async (c) => {
  const sessionId = c.req.param("id");

  // Forward the original upgrade request — preserves WebSocket headers
  const id = c.env.INTERVIEW_SESSION.idFromName(sessionId);
  const stub = c.env.INTERVIEW_SESSION.get(id);

  return stub.fetch(c.req.raw);
});

// list r2 objects
app.get("/api/list/r2", requireAuth, async (c) => {
  const listed = await c.env.MEDIA_BUCKET.list();
  return c.json(listed.objects);
});

app.get("/api/r2/download", requireAuth, async (c) => {
  const object = await c.env.MEDIA_BUCKET.get("sample.webm");
  if (object === null) {
    return c.text("Object Not Found", 404);
  }

  c.header("etag", object.httpEtag);
  c.header("Content-Disposition", 'attachment; filename="sample.webm"');

  if (object.httpMetadata?.contentType) {
    c.header("Content-Type", object.httpMetadata.contentType);
  }

  return c.body(object.body);
});

export default app;

// wrangler expects Durable object export from main file "src/index.ts"
export { InterviewSessionDO };
