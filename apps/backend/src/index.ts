import { Hono } from "hono";
import { SocketServer } from "../lib/socketServer";

export type Bindings = {
  SOCKET_OBJECT: DurableObjectNamespace;
  MY_BUCKET: R2Bucket;
  XAI_API_KEY: string;
  OPENROUTER_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/ws", (c) => {
  const id = c.env.SOCKET_OBJECT.idFromName("socket_object_instance");
  const stub = c.env.SOCKET_OBJECT.get(id);

  return stub.fetch(c.req.raw);
});

export default app;

// wrangler expects Durable object export from main file "src/index.ts"
export { SocketServer };
