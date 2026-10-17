import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
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
      url: "http://localhost:8791",
      reuseExistingServer: false,
    },
    {
      command: "bun e2e/mock-llm.ts",
      url: "http://localhost:8790",
      reuseExistingServer: false,
    },
    {
      command: "bun run --cwd apps/backend start",
      url: "http://localhost:8787",
      reuseExistingServer: false,
      env: {
        PORT: "8787",
        DATABASE_PATH: "../../.e2e.sqlite",
        BETTER_AUTH_SECRET: "e2e-only-secret-with-at-least-32-characters",
        FRONTEND_URL: "http://localhost:3000",
        BETTER_AUTH_URL: "http://localhost:8787",
        LLM_API_KEY: "test-provider-key",
        LLM_BASE_URL: "http://localhost:8790/v1",
        LLM_MODEL: "test-interviewer",
        DEEPGRAM_API_KEY: "test-voice-key",
        DEEPGRAM_WS_URL: "ws://localhost:8791",
        GOOGLE_CLIENT_ID: "",
        GOOGLE_CLIENT_SECRET: "",
      },
    },
    {
      command: "bun run --cwd apps/web start",
      env: { PORT: "3000" },
      url: "http://localhost:3000",
      reuseExistingServer: false,
    },
  ],
});
