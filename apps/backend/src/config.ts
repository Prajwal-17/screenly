import { config } from "dotenv";
import { z } from "zod";

config({ path: ".env", quiet: true });
const optional = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? undefined : value),
  z.string().optional(),
);
export const env = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(8787),
    DATABASE_PATH: z.string().default("./storage/local.sqlite"),
    FRONTEND_URL: z.url().default("http://localhost:3000"),
    BETTER_AUTH_URL: z.url().default("http://localhost:8787"),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "Use a random secret of at least 32 characters"),
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,
    DEEPGRAM_API_KEY: optional,
    DEEPGRAM_WS_URL: z.url().default("wss://api.deepgram.com"),
    DEEPGRAM_STT_MODEL: z.string().default("flux-general-en"),
    DEEPGRAM_TTS_MODEL: z.string().default("flux-alexis-en"),
    LLM_API_KEY: optional,
    LLM_BASE_URL: z.url().default("https://api.deepseek.com/v1"),
    LLM_MODEL: optional,
  })
  .parse(process.env);
export const capabilities = {
  google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  voice: Boolean(env.DEEPGRAM_API_KEY),
  llm: Boolean(env.LLM_API_KEY && env.LLM_MODEL),
};
