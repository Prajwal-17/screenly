import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { isDevLoginEnabled, type Config } from "./config";
import type { Database } from "./db";
import { developmentAuth } from "./lib/devAuth";
import * as schema from "./db/schema";

export function createAuth(db: Database, env: Config) {
  const googleProvider =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : undefined;

  const devPlugins = isDevLoginEnabled(env)
    ? [developmentAuth(env.FRONTEND_URL)]
    : [];

  return betterAuth({
    plugins: devPlugins,
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
      enabled: false,
    },
    socialProviders: googleProvider,
    onAPIError: {
      errorURL: `${env.FRONTEND_URL}/auth/sign-in?error=oauth`,
    },
  } as BetterAuthOptions);
}
