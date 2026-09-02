import { config } from "dotenv";

config({ path: ".env" });

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  PORT: Number(process.env.PORT ?? 8787),
  DATABASE_PATH: process.env.DATABASE_PATH ?? "./storage/local.sqlite",
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:3000",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:8787",
  BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID?.trim(),
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET?.trim(),
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY?.trim(),
  OMNIROUTE_API_KEY: process.env.OMNIROUTE_API_KEY?.trim(),
};
