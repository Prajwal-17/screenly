import { test, expect } from "bun:test";
test("opening migration preserves existing interviews and transcripts as technical conversation", async () => {
  const { Database } = await import("bun:sqlite");
  const sql = new Database(":memory:");
  try {
    const names = [
      "0000_init",
      "0001_greedy_ozymandias",
      "0002_uneven_phantom_reporter",
      "0003_lovely_weapon_omega",
      "0004_powerful_omega_sentinel",
      "0005_whole_nuke",
      "0006_yummy_spencer_smythe",
    ];
    for (const name of names)
      sql.exec(await Bun.file(`drizzle/${name}.sql`).text());
    sql.run(
      "INSERT INTO user (id,name,email) VALUES ('legacy','Member','member@example.com')",
    );
    sql.run(
      "INSERT INTO interview_session (id,user_id,created_at,updated_at,status,started_at) VALUES ('existing','legacy',1,1,'active',100)",
    );
    sql.run(
      "INSERT INTO interview_message (id,interview_id,role,content,source_key,created_at) VALUES ('answer','existing','user','An answer','source',101)",
    );
    sql.exec(
      await Bun.file("drizzle/0007_ambitious_living_lightning.sql").text(),
    );
    expect(
      sql
        .query("SELECT phase,started_at,candidate FROM interview_session")
        .get(),
    ).toEqual({ phase: "questions", started_at: 100, candidate: null });
    expect(
      sql.query("SELECT phase,content FROM interview_message").get(),
    ).toEqual({ phase: "questions", content: "An answer" });
  } finally {
    sql.close();
  }
});
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
