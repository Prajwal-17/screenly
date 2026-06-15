import { createMiddleware } from "hono/factory";
import { getAuth } from "../auth/auth";

export const authMiddleware = createMiddleware(async (c, next) => {
  const auth = getAuth(c.env);
  c.set("auth", auth);

  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});
