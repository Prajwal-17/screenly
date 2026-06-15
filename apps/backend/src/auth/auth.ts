import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import { CF_Bindings } from "../types/types";

let _auth: ReturnType<typeof betterAuth> | null = null;

export const getAuth = (env: CF_Bindings) => {
  if (!_auth) {
    _auth = betterAuth({
      baseURL: env.BETTER_AUTH_URL,
      trustedOrigins: ["http://localhost:3000"],
      database: drizzleAdapter(drizzle(env.APP_DB), {
        provider: "sqlite",
        schema,
      }),
      socialProviders: {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      },
    } as BetterAuthOptions);
  }
  return _auth!;
};
