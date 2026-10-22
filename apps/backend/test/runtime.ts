import { env } from "cloudflare:workers";
import { createExecutionContext } from "cloudflare:test";
import { app as workerApp } from "../src/app";
import { createServices } from "../src/context";
import { readConfig, getCapabilities } from "../src/config";
import { makeSignature } from "better-auth/crypto";

export const config = readConfig(env);
export const { db, auth, interviews, profiles } = createServices(env, config);
export const capabilities = getCapabilities(config);
export const app = {
  request: (input: string | Request, init?: RequestInit) =>
    workerApp.request(input, init, env, createExecutionContext()),
};
export async function createTestSession(onboarded = true) {
  const context = await auth.$context;
  const user = await context.internalAdapter.createUser(
    {
      name: "Test Candidate",
      email: `candidate-${crypto.randomUUID()}@example.com`,
      emailVerified: true,
    },
    { method: "oauth", oauth: { providerId: "google" } },
  );
  if (onboarded) await profiles.skip(user.id);
  const session = await context.internalAdapter.createSession(user.id);
  return {
    name: context.authCookies.sessionToken.name,
    value: `${session.token}.${await makeSignature(session.token, context.secret)}`,
  };
}
