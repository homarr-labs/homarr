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
  db.close();
  // The bundled CLI resolves a second copy of the native binding.
  appRequire(path.resolve("build/better_sqlite3.node"));

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
