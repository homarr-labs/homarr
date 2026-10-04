import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { promisify } from "node:util";
import { test } from "node:test";
import { setTimeout } from "node:timers/promises";

import { convert } from "../src/convert.mjs";
import { migrations, quote, schema } from "../src/legacy.mjs";
import { createFixture, fixtureCiphertext, fixtureDate, fixtureMedia, fixturePasswordHash } from "./fixture.mjs";

const exec = promisify(execFile);

test("real v1.77.1 MySQL converts losslessly and rejects unsafe sources", { timeout: 300_000 }, async (t) => {
  const fixture = await createFixture();
  const directory = await mkdtemp(join(tmpdir(), "homarr-conversion-"));
  t.after(async () => {
    try {
      await fixture.cleanup();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  const { connection, connectionOptions } = fixture;
  const output = join(directory, "db.sqlite");
  const sourceSnapshot = async () =>
    Object.fromEntries(
      await Promise.all(
        schema.tables.map(async ({ name }) => {
          const [rows] = await connection.query(`SELECT * FROM ${quote(name)}`);
          return [name, rows];
        }),
      ),
    );
  const before = await sourceSnapshot();
  await assert.rejects(convert({ connectionOptions, output }), /Stop every Homarr/);
  const result = await convert({ connectionOptions, output, homarrStopped: true });
  assert.equal(Object.keys(result.counts).length, 35);
  assert.equal(result.counts.serverSetting, 252);
  assert.deepEqual(await sourceSnapshot(), before);
  const database = new DatabaseSync(output, { readOnly: true });
  try {
    assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
    assert.equal(database.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
    assert.equal(database.prepare("SELECT password FROM user").get().password, fixturePasswordHash);
    assert.equal(database.prepare("SELECT value FROM integrationSecret").get().value, fixtureCiphertext);
    assert.deepEqual(Buffer.from(database.prepare("SELECT content FROM media").get().content), fixtureMedia);
    assert.equal(
      database.prepare("SELECT expires FROM session").get().expires,
      Date.parse(fixtureDate.replace(" ", "T") + "Z"),
    );
    assert.equal(
      database.prepare("SELECT updated_at FROM integrationSecret").get().updated_at,
      Date.parse(fixtureDate.replace(" ", "T") + "Z") / 1000,
    );
    assert.equal(database.prepare("SELECT image FROM user").get().image, null);
    const [sourceBoards] = await connection.query("SELECT custom_css, is_public FROM board");
    const convertedBoard = database.prepare("SELECT custom_css, is_public FROM board").get();
    assert.equal(convertedBoard.custom_css, sourceBoards[0].custom_css);
    assert.ok(convertedBoard.custom_css.length > 50_000);
    assert.ok(convertedBoard.custom_css.includes("café 🏡"));
    assert.equal(convertedBoard.is_public, 0);
    assert.equal(database.prepare("SELECT completed_manage_tour FROM user").get().completed_manage_tour, 1);
    assert.equal(database.prepare("SELECT is_enabled FROM cron_job_configuration").get().is_enabled, 0);
    assert.equal(database.prepare("SELECT parent_section_id FROM section_layout").get().parent_section_id, null);
    assert.equal(
      database.prepare("SELECT COUNT(*) AS n FROM __drizzle_migrations").get().n,
      migrations("sqlite").length,
    );
  } finally {
    database.close();
  }

  const original = await readFile(output);
  await assert.rejects(convert({ connectionOptions, output, homarrStopped: true }), /Destination already exists/);
  assert.deepEqual(await readFile(output), original);
  await connection.query("ALTER TABLE user ADD COLUMN unsupported_schema TEXT");
  await assert.rejects(
    convert({ connectionOptions, output: join(directory, "unsupported.sqlite"), homarrStopped: true }),
    /Unsupported or partially migrated/,
  );
  await connection.query("ALTER TABLE user DROP COLUMN unsupported_schema");
  await connection.query("UPDATE __drizzle_migrations SET hash = 'unknown' WHERE id = 1");
  await assert.rejects(
    convert({ connectionOptions, output: join(directory, "journal.sqlite"), homarrStopped: true }),
    /Unsupported migration journal/,
  );
  await connection.query("UPDATE __drizzle_migrations SET hash = ? WHERE id = 1", [migrations("mysql")[0].hash]);

  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  await connection.query("UPDATE groupMember SET user_id = 'missing-user'");
  await assert.rejects(
    convert({ connectionOptions, output: join(directory, "invalid.sqlite"), homarrStopped: true }),
    /broken relationships/,
  );
  await connection.query("UPDATE groupMember SET user_id = 'migration-user'");
  await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  assert.deepEqual(await readdir(directory), ["db.sqlite"]);
  assert.deepEqual(await sourceSnapshot(), before);

  const controller = new AbortController();
  const interrupted = convert({
    connectionOptions,
    output: join(directory, "interrupted.sqlite"),
    homarrStopped: true,
    signal: controller.signal,
  });
  // Observe a started copy rather than relying on a sleep duration to interrupt it.
  const rejection = assert.rejects(interrupted, /aborted/);
  const deadline = Date.now() + 10_000;
  while (!(await readdir(directory)).some((name) => name.startsWith("interrupted.sqlite.partial-"))) {
    if (Date.now() > deadline) throw new Error("Conversion did not start in time");
    await setTimeout(1);
  }
  controller.abort();
  await rejection;
  assert.deepEqual(await readdir(directory), ["db.sqlite"]);
  assert.deepEqual(await sourceSnapshot(), before);

  // Create a competing destination after conversion passes its initial existence check.
  const racedOutput = join(directory, "raced.sqlite");
  const racedConversion = convert({ connectionOptions, output: racedOutput, homarrStopped: true });
  const racedRejection = assert.rejects(racedConversion, { code: "EEXIST" });
  const raceDeadline = Date.now() + 10_000;
  while (!(await readdir(directory)).some((name) => name.startsWith("raced.sqlite.partial-"))) {
    if (Date.now() > raceDeadline) throw new Error("Conversion did not start before the destination race");
    await setTimeout(1);
  }
  const competingContent = Buffer.from("An independently created file must never be overwritten.");
  await writeFile(racedOutput, competingContent, { flag: "wx", mode: 0o600 });
  await racedRejection;
  assert.deepEqual(await readFile(racedOutput), competingContent);
  assert.deepEqual((await readdir(directory)).sort(), ["db.sqlite", "raced.sqlite"]);
  await rm(racedOutput);
  assert.deepEqual(await sourceSnapshot(), before);

  // Exercise the delivered Docker entrypoint against the same real database.
  const image = `homarr-mysql-converter-test:${process.pid}`;
  await exec("docker", ["build", "-t", image, "."], {
    cwd: new URL("../", import.meta.url),
    maxBuffer: 8 * 1024 * 1024,
  });
  t.after(() => exec("docker", ["image", "rm", image]));
  const environmentFile = join(directory, "connection.env");
  await writeFile(
    environmentFile,
    `MYSQL_HOST=127.0.0.1\nMYSQL_PORT=${connectionOptions.port}\nMYSQL_USER=${connectionOptions.user}\nMYSQL_PASSWORD=${connectionOptions.password}\nMYSQL_DATABASE=homarr\n`,
    { mode: 0o600 },
  );
  await exec("docker", [
    "run",
    "--rm",
    "--user",
    `${process.getuid()}:${process.getgid()}`,
    "--network",
    "host",
    "--env-file",
    environmentFile,
    "-v",
    `${directory}:/output`,
    image,
    "--output",
    "/output/packaged.sqlite",
    "--homarr-stopped",
  ]);
  const packaged = new DatabaseSync(join(directory, "packaged.sqlite"), { readOnly: true });
  try {
    assert.equal(packaged.prepare("SELECT password FROM user").get().password, fixturePasswordHash);
  } finally {
    packaged.close();
  }
  assert.deepEqual(await sourceSnapshot(), before);
});
