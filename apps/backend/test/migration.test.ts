import { test, expect } from "bun:test";
test("profile migration keeps existing members out of first-run setup", async () => {
  const { Database } = await import("bun:sqlite");
  const sql = new Database(":memory:");
  try {
    sql.exec("PRAGMA foreign_keys=ON");
    for (const name of [
      "0000_init",
      "0001_greedy_ozymandias",
      "0002_uneven_phantom_reporter",
    ])
      sql.exec(await Bun.file(`drizzle/${name}.sql`).text());
    sql.run("INSERT INTO user (id,name,email) VALUES (?,?,?)", [
      "legacy",
      "Existing Member",
      "existing@example.com",
    ]);
    sql.exec(await Bun.file("drizzle/0003_lovely_weapon_omega.sql").text());
    const row = sql
      .query("SELECT details,status FROM user_profile WHERE user_id=?")
      .get("legacy") as { details: string; status: string };
    expect(row.status).toBe("skipped");
    expect(JSON.parse(row.details).name).toBe("Existing Member");
    sql.run("DELETE FROM user WHERE id=?", ["legacy"]);
    expect(
      sql.query("SELECT count(*) AS total FROM user_profile").get(),
    ).toEqual({ total: 0 });
  } finally {
    sql.close();
  }
});

test("onboarding and import-limit migrations coexist on fresh and previously migrated databases", async () => {
  const { Database } = await import("bun:sqlite");
  for (const hasPriorImportTable of [false, true]) {
    const sql = new Database(":memory:");
    try {
      sql.exec("PRAGMA foreign_keys=ON");
      for (const name of [
        "0000_init",
        "0001_greedy_ozymandias",
        "0002_uneven_phantom_reporter",
        "0003_lovely_weapon_omega",
      ])
        sql.exec(await Bun.file(`drizzle/${name}.sql`).text());
      if (hasPriorImportTable)
        sql.exec(await Bun.file("drizzle/0005_whole_nuke.sql").text());
      sql.exec(
        await Bun.file("drizzle/0004_powerful_omega_sentinel.sql").text(),
      );
      sql.exec(await Bun.file("drizzle/0005_whole_nuke.sql").text());
      sql.run(
        "INSERT INTO user (id,name,email) VALUES ('member','Member','member@example.com')",
      );
      sql.run(
        "INSERT INTO user_profile (user_id,details,updated_at) VALUES ('member','{}',1)",
      );
      expect(sql.query("SELECT onboarding FROM user_profile").get()).toEqual({
        onboarding: '{"step":0,"pendingImport":null}',
      });
      sql.run("INSERT INTO profile_import_limit VALUES ('member',1,1,1)");
      expect(
        sql.query("SELECT count(*) AS total FROM profile_import_limit").get(),
      ).toEqual({ total: 1 });
    } finally {
      sql.close();
    }
  }
});
