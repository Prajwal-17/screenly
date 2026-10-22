import { readFileSync } from "node:fs";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          LEGACY_WORD_BASE64: readFileSync(
            "test/fixtures/legacy-word.doc",
          ).toString("base64"),
          TEST_MIGRATIONS: await readD1Migrations("./drizzle"),
          LIVE_PROFILE_URL: process.env.LIVE_PROFILE_URL ?? "",
          NODE_ENV: "test",
          ENABLE_DEV_LOGIN: "false",
          BETTER_AUTH_SECRET: "test-only-secret-with-at-least-32-characters",
          FRONTEND_URL: "http://localhost:3000",
          BETTER_AUTH_URL: "http://localhost:8787",
          GOOGLE_CLIENT_ID: "test-google-client-id",
          GOOGLE_CLIENT_SECRET: "test-google-client-secret",
          LLM_API_KEY: "",
          LLM_MODEL: "",
          DEEPGRAM_API_KEY: "",
        },
      },
    }),
  ],
  test: {
    include: [
      "test/{api,profile,interview,feedback,dev-auth,worker,tts}.test.ts",
    ],
    setupFiles: ["./test/setup.workers.ts"],
    fileParallelism: false,
  },
});
