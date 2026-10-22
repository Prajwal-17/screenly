// Test-only CLI; never mounted as an application endpoint.
import { makeSignature } from "better-auth/crypto";
import { getPlatformProxy } from "wrangler";
import { createDB } from "../src/db";
import { createProfiles } from "../src/db/profiles";
import { createAuth } from "../src/auth";
import { readConfig } from "../src/config";
import { resolve } from "node:path";
import { parse } from "jsonc-parser";
import { mkdir, writeFile, rm } from "node:fs/promises";

const proxyConfig = parse(await Bun.file("wrangler.jsonc").text());
delete proxyConfig.durable_objects;
delete proxyConfig.migrations;
await mkdir(".wrangler", { recursive: true });
const proxyConfigPath = resolve(
  `.wrangler/fixture-${crypto.randomUUID()}.json`,
);
await writeFile(proxyConfigPath, JSON.stringify(proxyConfig), { mode: 0o600 });
const proxy = await getPlatformProxy<Env>({
  configPath: proxyConfigPath,
  envFiles: [],
  persist: {
    path: resolve(process.env.D1_PERSIST_PATH ?? ".wrangler/state", "v3"),
  },
});
try {
  const db = createDB(proxy.env.DB);
  const profiles = createProfiles(db);
  const auth = createAuth(db, readConfig(process.env));
  const context = await auth.$context;
  const user = await context.internalAdapter.createUser(
    {
      name: "Test Candidate",
      email: `candidate-${crypto.randomUUID()}@example.com`,
      emailVerified: true,
    },
    { method: "oauth", oauth: { providerId: "google" } },
  );
  if (process.argv[2] !== "new") await profiles.skip(user.id);
  const session = await context.internalAdapter.createSession(user.id);
  const value = `${session.token}.${await makeSignature(session.token, context.secret)}`;
  console.log(
    JSON.stringify({ name: context.authCookies.sessionToken.name, value }),
  );
} finally {
  await proxy.dispose();
  await rm(proxyConfigPath, { force: true });
}
