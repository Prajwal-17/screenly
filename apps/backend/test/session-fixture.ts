// Test-only fixture: never mounted as an application endpoint.
import { makeSignature } from "better-auth/crypto";
import { auth } from "../src/auth";

export async function createTestSession() {
  const context = await auth.$context;
  const user = await context.internalAdapter.createUser(
    {
      name: "Test Candidate",
      email: `candidate-${crypto.randomUUID()}@example.com`,
      emailVerified: true,
    },
    { method: "oauth", oauth: { providerId: "google" } },
  );
  const session = await context.internalAdapter.createSession(user.id);
  const value = `${session.token}.${await makeSignature(session.token, context.secret)}`;
  return { name: context.authCookies.sessionToken.name, value };
}

if (import.meta.main) console.log(JSON.stringify(await createTestSession()));
