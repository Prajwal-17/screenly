import { createMiddleware } from "hono/factory";
import { getDB } from "../db/db";

export const dbMiddleware = createMiddleware(async (c, next) => {
  c.set("db", getDB(c.env));
  await next();
});
