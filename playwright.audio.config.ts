import { defineConfig, devices } from "@playwright/test";

// No backend/provider or app server is needed. A tiny local server serves the
// bundled worklet because AudioWorklet module fetches bypass Playwright routes.
const audioURL = `http://127.0.0.1:${process.env.SCREENLY_AUDIO_TEST_PORT ?? 9493}`;
export default defineConfig({
  testDir: "./e2e",
  testMatch: ["audio-playback.spec.ts", "audio-vad.spec.ts"],
  workers: 1,
  timeout: 60000,
  webServer: {
    command: "bun e2e/audio-test-server.ts",
    url: audioURL,
    reuseExistingServer: false,
  },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: audioURL,
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
});
