import { readMigrationFiles } from "drizzle-orm/migrator";

export const migrationHistoryReadLimit = (migrationsFolder: string) =>
  readMigrationFiles({ migrationsFolder }).length + 1;

export const assertMigrationHistory = (
  rows: { hash: unknown; created_at: unknown }[],
  migrationsFolder: string,
  engine: "SQLite" | "PostgreSQL",
) => {
  const migrations = readMigrationFiles({ migrationsFolder });
  if (rows.length === 0 || rows.length > migrations.length) throw new Error(`Unsupported ${engine} migration history`);
  for (const [index, row] of rows.entries()) {
    const migration = migrations[index];
    if (!migration || row.hash !== migration.hash || Number(row.created_at) !== migration.folderMillis) {
      throw new Error(`Unsupported ${engine} migration identity`);
    }
  }
};

export const assertSqliteMigrationHistory = (
  rows: { hash: unknown; created_at: unknown }[],
  migrationsFolder: string,
) => assertMigrationHistory(rows, migrationsFolder, "SQLite");
