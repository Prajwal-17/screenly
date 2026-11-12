import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: [
      ".open-next/**",
      ".wrangler/**",
      "public/vad/**",
      "public/audio/playback-processor.js",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...nextJsConfig,
  {
    files: ["next.config.js"],
    languageOptions: { globals: { process: "readonly" } },
  },
];
