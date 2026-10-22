import { defineConfig, devices } from "@playwright/test";
import { backendPort, backendURL, webPort, webURL } from "./e2e/environment";

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["local-auth.dev.ts", "workspace-visual.dev.ts"],
  workers: 1,
  timeout: 45000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: webURL,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "bun run --cwd apps/backend dev",
      url: backendURL,
      env: {
        NODE_ENV: "development",
        ENABLE_DEV_LOGIN: "true",
        PORT: String(backendPort),
        D1_PERSIST_PATH: "../../.local-e2e-workers",
        BETTER_AUTH_SECRET: "local-e2e-only-secret-at-least-32-characters",
        FRONTEND_URL: webURL,
        BETTER_AUTH_URL: backendURL,
        GOOGLE_CLIENT_ID: "",
        GOOGLE_CLIENT_SECRET: "",
        DEEPGRAM_API_KEY: "",
        LLM_API_KEY: "",
        LLM_MODEL: "",
      },
    },
    {
      command: "bun run --cwd apps/web dev",
      url: webURL,
      env: {
        NODE_ENV: "development",
        WEB_PORT: String(webPort),
        NEXT_PUBLIC_API_URL: backendURL,
      },
    },
  ],
});
