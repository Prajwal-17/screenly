import { parse } from "jsonc-parser";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { readConfig } from "../src/config";

const [command = "dev", ...extra] = Bun.argv.slice(2);
const remote = command === "deploy" || command === "migrate:remote";
const config = parse(await Bun.file("wrangler.jsonc").text());
config.main = resolve(config.main);
for (const database of config.d1_databases)
  database.migrations_dir = resolve(database.migrations_dir);
if (remote) {
  const id = process.env.CLOUDFLARE_DATABASE_ID;
  if (
    !id ||
    !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(id) ||
    /^0+-0+-0+-0+-0+$/.test(id)
  )
    throw new Error(
      "Set CLOUDFLARE_DATABASE_ID to your existing D1 database UUID before running a remote command.",
    );
  config.d1_databases[0].database_id = id;
  if (process.env.CLOUDFLARE_ACCOUNT_ID)
    config.account_id = process.env.CLOUDFLARE_ACCOUNT_ID;
}
const publicKeys = [
  "FRONTEND_URL",
  "BETTER_AUTH_URL",
  "DEEPGRAM_WS_URL",
  "DEEPGRAM_STT_MODEL",
  "DEEPGRAM_EOT_TIMEOUT_MS",
  "DEEPGRAM_TTS_MODEL",
  "DEEPGRAM_TTS_EXPRESSIVITY",
  "DEEPGRAM_TTS_SPEED",
  "LLM_BASE_URL",
  "LLM_MODEL",
  "LLM_INTERVIEW_MODEL",
  "LLM_INTERVIEW_REASONING_EFFORT",
  "LLM_INTERVIEW_MAX_TOKENS",
];
for (const key of publicKeys)
  if (process.env[key]) config.vars[key] = process.env[key];
if (command === "deploy") {
  for (const key of ["FRONTEND_URL", "BETTER_AUTH_URL"]) {
    const url = new URL(config.vars[key]);
    if (
      url.protocol !== "https:" ||
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
      throw new Error(
        `Set ${key} to your production HTTPS URL before deploying.`,
      );
  }
  config.vars.NODE_ENV = "production";
  config.vars.ENABLE_DEV_LOGIN = "false";
}
await mkdir(".wrangler", { recursive: true });
const token = crypto.randomUUID();
const configPath = resolve(`.wrangler/config-${token}.json`);
const varsPath = resolve(`.wrangler/.env-${token}`);
await writeFile(configPath, JSON.stringify(config), { mode: 0o600 });
const persistence = resolve(process.env.D1_PERSIST_PATH ?? ".wrangler/state");
let child: ReturnType<typeof Bun.spawn> | undefined;
async function run(args: string[]) {
  child = Bun.spawn(
    ["bun", "run", "wrangler", ...args, "--config", configPath],
    {
      env: {
        ...process.env,
        ...(command === "migrate:remote" &&
        !process.env.CLOUDFLARE_API_TOKEN &&
        process.env.CLOUDFLARE_D1_TOKEN
          ? { CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_D1_TOKEN }
          : {}),
      },
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
    },
  );
  const code = await child.exited;
  if (code !== 0) throw new Error(`Wrangler exited with status ${code}.`);
}
const forwardSignal = () => {
  child?.kill("SIGINT");
};
process.addListener("SIGINT", forwardSignal);
process.addListener("SIGTERM", forwardSignal);
try {
  if (command === "dev") {
    const local = readConfig({
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? "development",
    });
    config.vars.NODE_ENV = local.NODE_ENV;
    config.vars.ENABLE_DEV_LOGIN = local.ENABLE_DEV_LOGIN;
    await writeFile(configPath, JSON.stringify(config), { mode: 0o600 });
    await writeFile(
      varsPath,
      Object.entries(local)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${JSON.stringify(String(value))}`)
        .join("\n"),
      { mode: 0o600 },
    );
    await run([
      "d1",
      "migrations",
      "apply",
      "DB",
      "--local",
      "--persist-to",
      persistence,
    ]);
    await run([
      "dev",
      "--local",
      "--ip",
      "127.0.0.1",
      "--port",
      process.env.PORT ?? "8787",
      "--persist-to",
      persistence,
      "--env-file",
      varsPath,
      ...extra,
    ]);
  } else if (command.startsWith("migrate:")) {
    await run([
      "d1",
      "migrations",
      "apply",
      "DB",
      remote ? "--remote" : "--local",
      ...(!remote ? ["--persist-to", persistence] : []),
      ...extra,
    ]);
  } else if (command === "deploy") await run(["deploy", ...extra]);
  else throw new Error(`Unknown command: ${command}`);
} finally {
  await Promise.all([
    rm(configPath, { force: true }),
    rm(varsPath, { force: true }),
  ]);
}
