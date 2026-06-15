import { drizzle } from "drizzle-orm/d1";
import { CF_Bindings } from "../types/types";
import * as schema from "./schema";

export function getDB(env: CF_Bindings) {
  return drizzle(env.APP_DB, { schema });
}
