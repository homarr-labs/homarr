import { closeSync, constants, fstatSync, openSync, readSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { readMainTargetBundle } from "../main-target-catalog";

const assertTimestamp = (value: unknown, expected: number, engine: string) => {
  if (typeof value === "number" && Number.isSafeInteger(value) && value === expected) return;
  if (typeof value === "bigint" && value === BigInt(expected)) return;
  if (typeof value === "string" && value.length <= 16 && /^(0|[1-9]\d*)$/.test(value) && value === String(expected))
    return;
  throw new Error(`Unsupported ${engine} migration timestamp`);
};

export const migrationHistoryReadLimit = (migrationsFolder: string) => {
  if (!isAbsolute(migrationsFolder)) throw new Error("Migration assets require an explicit absolute root");
  const fd = openSync(join(migrationsFolder, "meta/_journal.json"), constants.O_RDONLY | constants.O_NOFOLLOW);
  let text: string;
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size < 1 || stat.size > 16384) throw new Error("Unsupported migration journal");
    const bytes = Buffer.alloc(stat.size + 1);
    let length = 0;
    while (length < bytes.length) {
      const read = readSync(fd, bytes, length, bytes.length - length, length);
      if (read === 0) break;
      length += read;
    }
    if (length !== stat.size) throw new Error("Unsupported migration journal bound");
    text = bytes.subarray(0, length).toString("utf8");
  } finally {
    closeSync(fd);
  }
  const journal: unknown = JSON.parse(text);
  if (
    typeof journal !== "object" ||
    journal === null ||
    !("dialect" in journal) ||
    (journal.dialect !== "sqlite" && journal.dialect !== "postgresql")
  )
    throw new Error("Unsupported migration journal dialect");
  return readMainTargetBundle(journal.dialect, migrationsFolder).migrationCount + 1;
};

export const assertMigrationHistory = (
  rows: { hash: unknown; created_at: unknown }[],
  migrationsFolder: string,
  engine: "SQLite" | "PostgreSQL",
) => {
  if (engine !== "SQLite" && engine !== "PostgreSQL") throw new Error("Unsupported migration engine");
  const { migrations } = readMainTargetBundle(engine === "SQLite" ? "sqlite" : "postgresql", migrationsFolder);
  if (rows.length === 0 || rows.length > migrations.length) throw new Error(`Unsupported ${engine} migration history`);
  for (const [index, row] of rows.entries()) {
    const migration = migrations[index];
    if (!migration || row.hash !== migration.hash) {
      throw new Error(`Unsupported ${engine} migration identity`);
    }
    assertTimestamp(row.created_at, migration.folderMillis, engine);
  }
};

export const assertSqliteMigrationHistory = (
  rows: { hash: unknown; created_at: unknown }[],
  migrationsFolder: string,
) => assertMigrationHistory(rows, migrationsFolder, "SQLite");

export const assertCompleteMigrationHistory = (
  rows: { hash: unknown; created_at: unknown }[],
  migrationsFolder: string,
  engine: "SQLite" | "PostgreSQL",
): void => {
  if (engine !== "SQLite" && engine !== "PostgreSQL") throw new Error("Unsupported migration engine");
  const bundle = readMainTargetBundle(engine === "SQLite" ? "sqlite" : "postgresql", migrationsFolder);
  if (rows.length !== bundle.migrationCount) throw new Error(`Unsupported ${engine} complete migration history`);
  assertMigrationHistory(rows, migrationsFolder, engine);
};
