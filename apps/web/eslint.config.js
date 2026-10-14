import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  { ignores: ["public/vad/**", "public/audio/playback-processor.js"] },
  ...nextJsConfig,
];
