import { expect, test } from "bun:test";

async function probe(
  mode: string | undefined,
  flag: string,
  frontend = "http://localhost:3000",
  backend = "http://localhost:8787",
) {
  const childEnv = {
    ...process.env,
    NODE_ENV: mode,
    ENABLE_DEV_LOGIN: flag,
    FRONTEND_URL: frontend,
    BETTER_AUTH_URL: backend,
    DATABASE_PATH: ":memory:",
    BETTER_AUTH_SECRET: "local-auth-test-only-secret-at-least-32-chars",
  };
  if (!mode) delete childEnv.NODE_ENV;
  const child = Bun.spawn([process.execPath, "test/dev-auth-probe.ts"], {
    env: childEnv,
    stdout: "pipe",
    stderr: "pipe",
  });
  const output = await new Response(child.stdout).text();
  const errors = await new Response(child.stderr).text();
  expect(await child.exited, errors).toBe(0);
  return JSON.parse(output.trim());
}

test("local email entry creates a real session, reuses accounts, and signs out", async () => {
  expect(await probe("development", "true")).toEqual({
    enabled: true,
    invalid: 400,
    untrusted: 403,
    noOrigin: 403,
    remoteHost: 403,
    status: 200,
    email: "developer@example.com",
    verified: false,
    sameUser: true,
    signOut: 200,
    signedOut: true,
  });
});

test("development bypass is absent in production, unset mode, test, disabled mode, and nonlocal deployments", async () => {
  for (const [mode, flag, frontend, backend] of [
    ["production", "true"],
    [undefined, "true"],
    ["test", "true"],
    ["development", "false"],
    ["development", "true", "https://app.example.com"],
    ["development", "true", "http://localhost:3000", "https://api.example.com"],
  ]) {
    expect(await probe(mode, flag!, frontend, backend)).toEqual({
      enabled: false,
      status: 404,
      cookie: false,
    });
  }
});
