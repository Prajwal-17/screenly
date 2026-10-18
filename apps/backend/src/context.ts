import { createAuth } from "./auth";
import type { Config } from "./config";
import { createDB } from "./db";
import { createInterviews } from "./db/interviews";
import { createProfiles } from "./db/profiles";
export function createServices(bindings: Env, config: Config) {
  const db = createDB(bindings.DB);
  return {
    db,
    auth: createAuth(db, config),
    interviews: createInterviews(db),
    profiles: createProfiles(db),
  };
}
export type AppEnv = {
  Bindings: Env;
  Variables: {
    config: Config;
    services: ReturnType<typeof createServices>;
    userId: string;
  };
};
