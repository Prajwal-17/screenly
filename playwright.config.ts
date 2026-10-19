import { defineConfig, devices } from "@playwright/test";
import {
  webPort,
  backendPort,
  webURL,
  backendURL,
  llmURL,
  voiceURL,
  portOffset,
} from "./e2e/environment";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: { baseURL: webURL, trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
          ],
        },
      },
    },
  ],
  webServer: [
    {
      command: "bun e2e/mock-deepgram.ts",
      url: voiceURL,
      reuseExistingServer: false,
    },
    {
      command: "bun e2e/mock-llm.ts",
      url: llmURL,
      reuseExistingServer: false,
    },
    {
      command: "bun run --cwd apps/backend start",
      url: backendURL,
      reuseExistingServer: false,
      env: {
        PORT: String(backendPort),
        D1_PERSIST_PATH: `../../.e2e-workers${portOffset ? `-${portOffset}` : ""}`,
        BETTER_AUTH_SECRET: "e2e-only-secret-with-at-least-32-characters",
        FRONTEND_URL: webURL,
        BETTER_AUTH_URL: backendURL,
        LLM_API_KEY: "test-provider-key",
        LLM_BASE_URL: `${llmURL}/v1`,
        LLM_MODEL: "test-interviewer",
        DEEPGRAM_API_KEY: "test-voice-key",
        DEEPGRAM_WS_URL: voiceURL.replace("http:", "ws:"),
        GOOGLE_CLIENT_ID: "",
        GOOGLE_CLIENT_SECRET: "",
      },
    },
    {
      command: "bun run --cwd apps/web start",
      env: { PORT: String(webPort) },
      url: webURL,
      reuseExistingServer: false,
    },
  ],
});
