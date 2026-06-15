import { Hono } from "hono";
import { cors } from "hono/cors";
import { SocketServer } from "../lib/socketServer";
import { authMiddleware } from "./middleware/authMiddleware";
import { dbMiddleware } from "./middleware/dbMiddleware";
import type { CF_Bindings, HonoVariables } from "./types/types";

const app = new Hono<{
  Bindings: CF_Bindings;
  Variables: HonoVariables;
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

app.use("*", dbMiddleware);
app.use("*", authMiddleware);

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  const auth = c.get("auth");
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
