import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".dev.vars", override: false });

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  PORT: Number(process.env.PORT ?? 8787),
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:3000",
  DATABASE_PATH: process.env.DATABASE_PATH ?? "./local.sqlite",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:8787",
  BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID?.trim(),
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET?.trim(),
};
