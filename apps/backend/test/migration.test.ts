import { afterEach, beforeEach, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = join(dirname(fileURLToPath(import.meta.url)), "../drizzle");
const migration = await Bun.file(join(directory, "0000_init.sql")).text();
let sql: Database;

beforeEach(() => {
  sql = new Database(":memory:");
  sql.exec("PRAGMA foreign_keys=ON");
  sql.exec(migration);
});
afterEach(() => sql.close());

test("one initial migration creates all application tables on an empty database", async () => {
  expect(
    readdirSync(directory).filter((name) => name.endsWith(".sql")),
  ).toEqual(["0000_init.sql"]);
  const journal = JSON.parse(
    await Bun.file(join(directory, "meta/_journal.json")).text(),
  );
  expect(journal.entries).toHaveLength(1);
  expect(journal.entries[0]).toMatchObject({ idx: 0, tag: "0000_init" });
  expect(readdirSync(join(directory, "meta")).sort()).toEqual([
    "0000_snapshot.json",
    "_journal.json",
  ]);
  expect(
    sql
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all(),
  ).toEqual(
    [
      "account",
      "interview_message",
      "interview_session",
      "profile_import_limit",
      "session",
      "user",
      "user_profile",
      "verification",
    ].map((name) => ({ name })),
  );
});

test("the initial schema includes current interview and onboarding defaults", () => {
  sql.run(
    "INSERT INTO user (id,name,email) VALUES ('member','Member','member@example.com')",
  );
  sql.run(
    "INSERT INTO interview_session (id,user_id,created_at,updated_at) VALUES ('interview','member',1,1)",
  );
  sql.run(
    "INSERT INTO interview_message (id,interview_id,role,content,source_key,created_at) VALUES ('answer','interview','user','An answer','source',1)",
  );
  sql.run(
    "INSERT INTO user_profile (user_id,details,updated_at) VALUES ('member','{}',1)",
  );
  expect(
    sql
      .query(
        "SELECT status,phase,candidate,started_at,paused_at,paused_ms,feedback_status FROM interview_session",
      )
      .get(),
  ).toEqual({
    status: "draft",
    phase: "questions",
    candidate: null,
    started_at: null,
    paused_at: null,
    paused_ms: 0,
    feedback_status: "pending",
  });
  expect(sql.query("SELECT phase,status FROM interview_message").get()).toEqual(
    {
      phase: "questions",
      status: "complete",
    },
  );
  expect(
    sql.query("SELECT onboarding,status,completed_at FROM user_profile").get(),
  ).toEqual({
    onboarding: '{"step":0,"pendingImport":null}',
    status: "draft",
    completed_at: null,
  });
});

test("the initial schema enforces account uniqueness and ownership cascades", () => {
  sql.run(
    "INSERT INTO user (id,name,email) VALUES ('member','Member','member@example.com')",
  );
  sql.run(
    "INSERT INTO account (id,issuer,account_id,provider_id,user_id) VALUES ('account','google','google-id','google','member')",
  );
  expect(() =>
    sql.run(
      "INSERT INTO account (id,issuer,account_id,provider_id,user_id) VALUES ('duplicate','google','google-id','google','member')",
    ),
  ).toThrow();
  sql.run(
    "INSERT INTO session (id,expires_at,token,user_id) VALUES ('session',1,'token','member')",
  );
  sql.run(
    "INSERT INTO interview_session (id,user_id,created_at,updated_at) VALUES ('interview','member',1,1)",
  );
  sql.run(
    "INSERT INTO interview_message (id,interview_id,role,content,source_key,created_at) VALUES ('answer','interview','user','An answer','source',1)",
  );
  sql.run(
    "INSERT INTO user_profile (user_id,details,updated_at) VALUES ('member','{}',1)",
  );
  sql.run("INSERT INTO profile_import_limit VALUES ('member',1,1,1)");
  sql.run("DELETE FROM user WHERE id='member'");
  for (const table of [
    "account",
    "session",
    "interview_session",
    "interview_message",
    "user_profile",
    "profile_import_limit",
  ])
    expect(sql.query(`SELECT count(*) AS total FROM ${table}`).get()).toEqual({
      total: 0,
    });
});
