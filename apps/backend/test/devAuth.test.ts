import { afterEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/bun-sqlite";
import {
  getCapabilities,
  isDevLoginEnabled,
  readConfig,
  readLocalConfig,
} from "../src/config";
import * as schema from "../src/db/schema";
import { developmentAuth } from "../src/lib/devAuth";

const bindings = {
  BETTER_AUTH_SECRET: "test-secret-with-at-least-32-characters",
};
const databases: Database[] = [];
afterEach(() => {
  for (const db of databases.splice(0)) db.close();
});

test("only local development defaults to email login, and explicit opt-out wins", () => {
  expect(getCapabilities(readLocalConfig(bindings)).devLogin).toBe(true);
  expect(
    isDevLoginEnabled(
      readLocalConfig({ ...bindings, ENABLE_DEV_LOGIN: "false" }),
    ),
  ).toBe(false);
  expect(isDevLoginEnabled(readConfig(bindings))).toBe(false);
  for (const NODE_ENV of ["production", "test"]) {
    expect(isDevLoginEnabled(readLocalConfig({ ...bindings, NODE_ENV }))).toBe(
      false,
    );
    expect(
      isDevLoginEnabled(
        readLocalConfig({ ...bindings, NODE_ENV, ENABLE_DEV_LOGIN: "true" }),
      ),
    ).toBe(false);
  }
  for (const key of ["FRONTEND_URL", "BETTER_AUTH_URL"]) {
    for (const origin of [
      "https://screenly.example.com",
      "http://localhost.evil.example",
      "http://192.168.1.10:3000",
    ]) {
      expect(
        isDevLoginEnabled(readLocalConfig({ ...bindings, [key]: origin })),
      ).toBe(false);
    }
  }
});

async function setup() {
  const sql = new Database(":memory:");
  databases.push(sql);
  sql.exec(
    await Bun.file(new URL("../drizzle/0000_init.sql", import.meta.url)).text(),
  );
  return betterAuth({
    baseURL: "http://localhost:8787",
    secret: bindings.BETTER_AUTH_SECRET,
    trustedOrigins: ["http://localhost:3000"],
    database: drizzleAdapter(drizzle(sql, { schema }), {
      provider: "sqlite",
      schema,
    }),
    plugins: [developmentAuth("http://localhost:3000")],
  });
}

function signIn(
  auth: Awaited<ReturnType<typeof setup>>,
  email: string,
  origin = "http://localhost:3000",
) {
  return auth.handler(
    new Request("http://localhost:8787/api/auth/sign-in/development", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ email }),
    }),
  );
}

test("email login issues a real session and returns to the same user's workspace", async () => {
  const auth = await setup();
  const response = await signIn(auth, "  Developer@Example.com  ");
  expect(response.status).toBe(200);
  const first = (await response.json()) as {
    user: { id: string; email: string };
  };
  expect(first.user.email).toBe("developer@example.com");
  const cookie = response.headers.get("set-cookie");
  expect(cookie).toContain("better-auth.session_token=");
  const session = await auth.handler(
    new Request("http://localhost:8787/api/auth/get-session", {
      headers: { Cookie: cookie! },
    }),
  );
  expect(session.status).toBe(200);
  expect(await session.json()).toMatchObject({
    user: { id: first.user.id, emailVerified: false },
  });
  const again = await signIn(auth, "developer@example.com");
  expect(again.status).toBe(200);
  expect(await again.json()).toMatchObject({ user: { id: first.user.id } });
  const other = await signIn(auth, "other@example.com");
  expect(other.status).toBe(200);
  expect(((await other.json()) as { user: { id: string } }).user.id).not.toBe(
    first.user.id,
  );
});

test("email login rejects invalid emails and untrusted origins", async () => {
  const auth = await setup();
  expect((await signIn(auth, "invalid")).status).toBe(400);
  expect(
    (await signIn(auth, "developer@example.com", "https://evil.example"))
      .status,
  ).toBe(403);
  expect((await signIn(auth, "developer@example.com", "")).status).toBe(403);
});
