import { readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

import AdmZip from "adm-zip";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { parse } from "superjson";

let phase = "configuration";
process.on("uncaughtException", (error) => {
  process.stderr.write(JSON.stringify({ name: error.name, code: "code" in error ? error.code : undefined, phase }));
  process.exitCode = 1;
});

const [sourcePath, migrationsFolder, archivePath, rowsPath, sourceVersion] = process.argv.slice(2);
if (
  !sourcePath ||
  !migrationsFolder ||
  !archivePath ||
  !rowsPath ||
  !["49", "50"].includes(sourceVersion) ||
  ![sourcePath, migrationsFolder, archivePath, rowsPath].every(isAbsolute) ||
  dirname(sourcePath) !== dirname(archivePath) ||
  dirname(sourcePath) !== dirname(rowsPath)
)
  throw new Error("Explicit owned fixture paths are required");
const journal = JSON.parse(readFileSync(join(migrationsFolder, "meta/_journal.json"), "utf8"));
if (journal.entries.length !== Number(sourceVersion)) throw new Error("Fixture migration version mismatch");
const rows = parse(readFileSync(rowsPath, "utf8"));
if (typeof rows !== "object" || rows === null || Array.isArray(rows)) throw new Error("Invalid synthetic fixture rows");
writeFileSync(sourcePath, new Uint8Array(), { flag: "wx", mode: 0o600 });
const database = new Database(sourcePath);
try {
  phase = "schema-migration";
  migrate(drizzle(database, { casing: "snake_case" }), { migrationsFolder });
  if (database.prepare("SELECT COUNT(*) AS count FROM __drizzle_migrations").get().count !== Number(sourceVersion))
    throw new Error("Fixture migration ledger mismatch");
  phase = "population";
  database.transaction(() => {
    database.exec("PRAGMA defer_foreign_keys = ON");
    if (Object.hasOwn(rows, "homarr_runtime_meta")) {
      if (sourceVersion !== "50") throw new Error("Runtime rows require the current fixture version");
      database.prepare('DELETE FROM "homarr_runtime_meta"').run();
    }
    for (const [table, records] of Object.entries(rows)) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table) || !Array.isArray(records)) throw new Error("Invalid fixture table");
      for (const record of records) {
        if (typeof record !== "object" || record === null || Array.isArray(record))
          throw new Error("Invalid fixture record");
        const columns = Object.keys(record);
        if (columns.some((column) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(column)))
          throw new Error("Invalid fixture column");
        const values = Object.values(record).map((value) => (value instanceof Uint8Array ? Buffer.from(value) : value));
        if (
          database
            .prepare(
              `SELECT 1 FROM "${table}" WHERE ${columns.map((column) => `"${column}" IS ?`).join(" AND ")} LIMIT 1`,
            )
            .get(...values)
        )
          continue;
        database
          .prepare(
            `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
          )
          .run(...values);
      }
    }
  })();
} finally {
  database.close();
}
const source = new Database(sourcePath, { readonly: true });
try {
  const snapshotPath = join(dirname(sourcePath), "legacy-export.sqlite");
  phase = "export-checkpoint";
  source.pragma("wal_checkpoint(TRUNCATE)");
  phase = "export-snapshot";
  source.prepare("VACUUM INTO ?").run(snapshotPath);
  const archive = new AdmZip();
  phase = "export-archive";
  archive.addFile("db.sqlite", readFileSync(snapshotPath));
  archive.addFile(
    "metadata.json",
    Buffer.from(
      JSON.stringify({
        homarrVersion: "2.4.1",
        exportedAt: "2026-10-10T00:00:00.000Z",
        dbDialect: "sqlite",
        encryptionKey: "11".repeat(32),
      }),
    ),
  );
  writeFileSync(archivePath, archive.toBuffer(), { flag: "wx", mode: 0o600 });
} finally {
  source.close();
}
