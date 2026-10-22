import { execFileSync } from "node:child_process";
import type { BrowserContext } from "@playwright/test";
import { portOffset } from "./environment";

export async function signInForTest(context: BrowserContext, onboarded = true) {
  const output = execFileSync(
    "bun",
    ["test/session-fixture.ts", onboarded ? "complete" : "new"],
    {
      cwd: "apps/backend",
      env: {
        ...process.env,
        D1_PERSIST_PATH: `../../.e2e-workers${portOffset ? `-${portOffset}` : ""}`,
        BETTER_AUTH_SECRET: "e2e-only-secret-with-at-least-32-characters",
      },
      encoding: "utf8",
    },
  );
  const cookie = JSON.parse(output.trim().split("\n").at(-1)!);
  await context.addCookies([
    {
      ...cookie,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
