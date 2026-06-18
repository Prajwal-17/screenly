import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { getAuth } from "../auth/auth";

export const authMiddleware = createMiddleware(async (c, next) => {
  const auth = getAuth(c.env);
  c.set("auth", auth);

  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
  } else {
    c.set("user", session.user);
    c.set("session", session.session);
  }
  await next();
});

export const requireAuth = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  await next();
});
