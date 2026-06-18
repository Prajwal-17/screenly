import type { Session, User } from "better-auth";
import type { getAuth } from "../auth/auth";
import { getDB } from "../db/db";

// hono/cf bindings — access via c.env.<key>
export type CF_Bindings = {
  // secrets
  BETTER_AUTH_URL: string;
  XAI_API_KEY: string;
  OPENROUTER_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  // cf bindings
  INTERVIEW_SESSION: DurableObjectNamespace;
  MEDIA_BUCKET: R2Bucket;
  APP_DB: D1Database;
};

// hono context variables — access via c.get("db"), c.get("user"), etc.
export type HonoVariables = {
  db: ReturnType<typeof getDB>;
  auth: ReturnType<typeof getAuth>;
  user: User | null;
  session: Session | null;
};
