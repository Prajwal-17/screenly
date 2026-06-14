import { Hono } from "hono";
import { cors } from "hono/cors";
import { SocketServer } from "../lib/socketServer";
import { auth } from "./auth/auth";

export type Bindings = {
  // secrets
  XAI_API_KEY: string;
  OPENROUTER_API_KEY: string;
  // cf bindings
  SOCKET_OBJECT: DurableObjectNamespace;
  MEDIA_BUCKET: R2Bucket;
  APP_DB: D1Database;
};

const app = new Hono<{
  Bindings: Bindings;
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

app.use(
  "/api/auth/*",
  cors({
    origin: "http://localhost:3000",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    c.set("user", null);
    c.set("session", null);
    // await next();
    return c.text("unauthorized", 401);
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.get("/", async (c) => {
  return c.text("Hello Hono!");
});

app.get("/api/protected", async (c, next) => {
  return c.text("Verified");
});

app.get("/ws", (c) => {
  const id = c.env.SOCKET_OBJECT.idFromName("socket_object_instance");
  const stub = c.env.SOCKET_OBJECT.get(id);

  return stub.fetch(c.req.raw);
});

export default app;

// wrangler expects Durable object export from main file "src/index.ts"
export { SocketServer };
