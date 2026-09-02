import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "./config";
import { db } from "./db";
import * as schema from "./db/schema";

const googleProvider =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined;

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.FRONTEND_URL],
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  account: {
    identityStrategy: "provider-id",
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: googleProvider,
} as BetterAuthOptions);
