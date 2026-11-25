const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const path = require("node:path");

async function validate() {
  const [distribution, architecture] = process.argv.slice(2);
  const expectedArch = { amd64: "x64", arm64: "arm64" }[architecture];
  assert.ok(expectedArch, `Unsupported archive architecture: ${architecture}`);
  assert.equal(process.arch, expectedArch);
  const glibc = process.report.getReport().header.glibcVersionRuntime;
  let libc = "alpine";
  if (glibc) libc = "debian";
  assert.equal(libc, distribution);

  const appRequire = createRequire(path.resolve("apps/nextjs/server.js"));
  const Database = appRequire("better-sqlite3");
  const db = new Database(":memory:");
  assert.equal(db.prepare("SELECT 1 AS value").get().value, 1);
  const version = db.prepare("SELECT sqlite_version() AS version").get().version;
  const [major, minor] = version.split(".").map(Number);
  assert.ok(major > 3 || (major === 3 && minor >= 54), `Expected SQLite 3.54 or newer, received ${version}`);
  db.close();
  // CLI and migration bundles resolve the same external wrapper as the application.
  const cliRequire = createRequire(path.resolve("apps/cli/cli.cjs"));
  assert.equal(cliRequire.resolve("better-sqlite3"), appRequire.resolve("better-sqlite3"));
  const migrationRequire = createRequire(path.resolve("db/migrations/sqlite/migrate.cjs"));
  assert.equal(migrationRequire.resolve("better-sqlite3"), appRequire.resolve("better-sqlite3"));
  const cliDb = new (cliRequire("better-sqlite3"))(":memory:");
  assert.equal(cliDb.prepare("SELECT 1 AS value").get().value, 1);
  cliDb.close();

  const sharp = appRequire("sharp");
  const image = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } })
    .resize(1, 1)
    .png()
    .toBuffer();
  assert.ok(image.length > 0);

  const bcrypt = appRequire("bcrypt");
  assert.ok(bcrypt.compareSync("archive-validation", bcrypt.hashSync("archive-validation", 4)));
  console.log(JSON.stringify({ architecture, libc, node: process.version, sqlite: true, sharp: true, bcrypt: true }));
}

validate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
