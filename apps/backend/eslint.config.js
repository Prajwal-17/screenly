import { config } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  { ignores: [".wrangler/**", "src/worker-configuration.d.ts"] },
  ...config,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off",
    },
  },
];
