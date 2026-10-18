import { execFileSync } from "node:child_process";
import type { BrowserContext } from "@playwright/test";
import { portOffset } from "./environment";

export async function signInForTest(context: BrowserContext) {
  const output = execFileSync("bun", ["test/session-fixture.ts"], {
    cwd: "apps/backend",
    env: {
      ...process.env,
      DATABASE_PATH: `../../.e2e${portOffset ? `-${portOffset}` : ""}.sqlite`,
      BETTER_AUTH_SECRET: "e2e-only-secret-with-at-least-32-characters",
    },
    encoding: "utf8",
  });
  const cookie = JSON.parse(output.trim());
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
