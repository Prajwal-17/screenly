import { expect, test } from "vitest";
import { createAuth } from "../src/auth";
import { readConfig, getCapabilities } from "../src/config";
import { db, config } from "./runtime";

function fixture(overrides: Record<string, unknown> = {}) {
  const settings = readConfig({
    ...config,
    NODE_ENV: "development",
    ENABLE_DEV_LOGIN: "true",
    ...overrides,
  });
  const auth = createAuth(db, settings);
  const send = (
    email: string,
    origin: string | null = settings.FRONTEND_URL,
    url = "http://localhost:8787/api/auth/sign-in/development",
  ) =>
    auth.handler(
      new Request(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(origin ? { Origin: origin } : {}),
        },
        body: JSON.stringify({ email }),
      }),
    );
  return { settings, auth, send };
}
test("local email entry creates a real D1 session, reuses accounts, and signs out", async () => {
  const { auth, send } = fixture();
  expect((await send("invalid")).status).toBe(400);
  expect(
    (await send("developer@example.com", "https://other.example")).status,
  ).toBe(403);
  expect((await send("developer@example.com", null)).status).toBe(403);
  expect(
    (
      await send(
        "developer@example.com",
        config.FRONTEND_URL,
        "https://remote.example/api/auth/sign-in/development",
      )
    ).status,
  ).toBe(403);
  const first = await send("  Developer@Example.com  ");
  expect(first.status).toBe(200);
  const cookie = first.headers.get("set-cookie")!.split(";")[0]!;
  const user = await first.json<any>();
  const session = await auth.api.getSession({
    headers: new Headers({ Cookie: cookie }),
  });
  expect(session?.user.email).toBe("developer@example.com");
  expect(session?.user.emailVerified).toBe(false);
  expect(
    (await (await send("developer@example.com")).json<any>()).user.id,
  ).toBe(user.user.id);
  const signedOut = await auth.handler(
    new Request("http://localhost:8787/api/auth/sign-out", {
      method: "POST",
      headers: {
        Origin: config.FRONTEND_URL,
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: "{}",
    }),
  );
  expect(signedOut.status).toBe(200);
  expect(
    await auth.api.getSession({ headers: new Headers({ Cookie: cookie }) }),
  ).toBeNull();
});
test("development bypass remains absent outside explicitly opted-in loopback development", async () => {
  for (const override of [
    { NODE_ENV: "production" },
    { NODE_ENV: undefined },
    { NODE_ENV: "test" },
    { ENABLE_DEV_LOGIN: "false" },
    { FRONTEND_URL: "https://app.example.com" },
    { BETTER_AUTH_URL: "https://api.example.com" },
  ]) {
    const { settings, send } = fixture(override);
    expect(getCapabilities(settings).devLogin).toBe(false);
    const response = await send("developer@example.com");
    expect(response.status).toBe(404);
    expect(response.headers.has("set-cookie")).toBe(false);
  }
});
