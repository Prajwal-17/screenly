import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { env } from "../config";
import * as schema from "./schema";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

if (env.DATABASE_PATH !== ":memory:")
  mkdirSync(dirname(env.DATABASE_PATH), { recursive: true });
export const sqlite = new Database(env.DATABASE_PATH, {
  create: true,
  strict: true,
});

sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: "./drizzle" });
