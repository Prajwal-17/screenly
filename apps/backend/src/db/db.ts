import { drizzle } from "drizzle-orm/d1";
import { Context } from "hono";
import { Bindings } from "..";

export default {
  async fetch(c: Context, request: Request, env: Bindings) {
    const db = drizzle(env.APP_DB);
  },
};
