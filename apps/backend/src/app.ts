import { Hono } from "hono";
import { profileRoutes } from "./routes/profile";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { settingsSchema, finishInterviewSchema } from "@repo/shared";
import { readConfig, getCapabilities } from "./config";
import { createServices, type AppEnv } from "./context";

export const app = new Hono<AppEnv>();
app.use("*", async (c, next) => {
  const config = readConfig(c.env);
  c.set("config", config);
  c.set("services", createServices(c.env, config));
  await next();
});
app.use(
  "/api/*",
  cors({
    origin: (_origin, c) => c.get("config").FRONTEND_URL,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);
app.get("/", (c) =>
  c.json({ service: "ai-interviewer-backend", status: "ok" }),
);
app.get("/api/capabilities", (c) => c.json(getCapabilities(c.get("config"))));
app.on(["GET", "POST"], "/api/auth/*", (c) =>
  c.get("services").auth.handler(c.req.raw),
);
app.route("/api/profile", profileRoutes);
app.use("/api/interviews/*", async (c, next) => {
  const session = await c
    .get("services")
    .auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Sign in to continue." }, 401);
  c.set("userId", session.user.id);
  await next();
});
app.use("/api/interviews", async (c, next) => {
  const session = await c
    .get("services")
    .auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Sign in to continue." }, 401);
  c.set("userId", session.user.id);
  await next();
});
app.get("/api/interviews", async (c) =>
  c.json(await c.get("services").interviews.list(c.get("userId"))),
);
app.post("/api/interviews", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success)
    return c.json(
      { error: "Choose a role, experience level, topics, and duration." },
      400,
    );
  return c.json(
    await c.get("services").interviews.create(c.get("userId"), parsed.data),
    201,
  );
});
app.use("/api/interviews/:id/*", async (c, next) => {
  if (
    !(await c
      .get("services")
      .interviews.owned(c.req.param("id")!, c.get("userId")))
  )
    return c.json({ error: "Interview not found." }, 404);
  await next();
});
app.get("/api/interviews/:id", async (c) => {
  const { interviews } = c.get("services");
  const owned = await interviews.owned(c.req.param("id"), c.get("userId"));
  return owned
    ? c.json(await interviews.get(owned.id))
    : c.json({ error: "Interview not found." }, 404);
});
app.delete("/api/interviews/:id", async (c) => {
  const { interviews } = c.get("services");
  const id = c.req.param("id");
  if (!(await interviews.owned(id, c.get("userId"))))
    return c.json({ error: "Interview not found." }, 404);
  await c.env.INTERVIEWS.getByName(id).closeSession();
  await interviews.remove(id, c.get("userId"));
  return c.body(null, 204);
});
app.post(
  "/api/interviews/:id/finish",
  bodyLimit({ maxSize: 1024 }),
  async (c) => {
    const text = await c.req.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      return c.json({ error: "Choose whether to generate feedback." }, 400);
    }
    const parsed = finishInterviewSchema.safeParse(body);
    if (!parsed.success)
      return c.json({ error: "Choose whether to generate feedback." }, 400);
    const id = c.req.param("id");
    const interview = await c.get("services").interviews.get(id);
    if (interview?.status === "draft")
      return c.json({ error: "Start the interview first." }, 409);
    await c.env.INTERVIEWS.getByName(id).finish(
      id,
      parsed.data.generateFeedback,
    );
    return c.json(await c.get("services").interviews.get(id));
  },
);
app.post("/api/interviews/:id/feedback", async (c) => {
  const id = c.req.param("id");
  if ((await c.get("services").interviews.get(id))?.status !== "completed")
    return c.json({ error: "Finish the interview first." }, 409);
  await c.env.INTERVIEWS.getByName(id).queueFeedback(id, true);
  return c.json(
    { status: (await c.get("services").interviews.get(id))?.feedbackStatus },
    202,
  );
});
app.get("/api/interviews/:id/ws", async (c) => {
  if (c.req.header("Origin") !== c.get("config").FRONTEND_URL)
    return c.json({ error: "Origin is not allowed." }, 403);
  if (c.req.header("Upgrade")?.toLowerCase() !== "websocket")
    return c.json({ error: "WebSocket upgrade required." }, 426);
  return c.env.INTERVIEWS.getByName(c.req.param("id")).fetch(c.req.raw);
});
app.onError((error, c) => {
  console.error(JSON.stringify({ event: "api_error", message: error.message }));
  return c.json({ error: "Something went wrong. Please try again." }, 500);
});
