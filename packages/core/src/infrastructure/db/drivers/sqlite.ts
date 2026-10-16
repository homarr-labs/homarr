import { createRequire } from "node:module";

import BetterSqlite3 from "better-sqlite3";
import type { RunResult } from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { migrate as migrateBetterSqlite } from "drizzle-orm/better-sqlite3/migrator";
import type { MigrationConfig } from "drizzle-orm/migrator";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type { DrizzleConfig } from "drizzle-orm";

import { dbEnv } from "../env";
import type { SharedDrizzleConfig } from "./shared";

type SqliteBinding = string | number | bigint | null | Uint8Array;

export interface SqliteStatement {
  all(...parameters: SqliteBinding[]): unknown[];
  get(...parameters: SqliteBinding[]): unknown;
  run(...parameters: SqliteBinding[]): RunResult;
}

/** The synchronous SQL operations used by backup export and restore. */
export interface SqliteConnection {
  close(): void;
  exec(sql: string): unknown;
  prepare(sql: string): SqliteStatement;
  transaction<T>(callback: () => T): () => T;
}

export type SqliteDatabase<TSchema extends Record<string, unknown>> = BaseSQLiteDatabase<"sync", RunResult, TSchema>;

interface OpenSqliteDatabase<TSchema extends Record<string, unknown>> {
  db: SqliteDatabase<TSchema>;
  connection: SqliteConnection;
  migrate(config: MigrationConfig): void;
}

interface BunSqliteModule {
  Database: new (
    filename: string,
    options: { readonly?: boolean; readwrite?: boolean; create?: boolean },
  ) => SqliteConnection;
}

interface BunSqliteDriverModule {
  drizzle<TSchema extends Record<string, unknown>>(
    connection: SqliteConnection,
    config: DrizzleConfig<TSchema>,
  ): SqliteDatabase<TSchema>;
}

interface BunSqliteMigratorModule {
  migrate<TSchema extends Record<string, unknown>>(db: SqliteDatabase<TSchema>, config: MigrationConfig): void;
}

/** DB_DRIVER remains better-sqlite3; Bun and Node open the same SQLite files. */
export const openSqliteDatabase = <TSchema extends Record<string, unknown>>(
  filename: string,
  config: DrizzleConfig<TSchema>,
  options: { readonly?: boolean } = {},
): OpenSqliteDatabase<TSchema> => {
  if (process.versions.bun) {
    // Keep Bun-only modules out of Node/Next.js module resolution. The backend
    // assembly retains drizzle-orm as a runtime dependency for these lazy loads.
    const requireBun = createRequire(import.meta.url);
    const sqliteModule = "bun:sqlite";
    const driverModule = "drizzle-orm/bun-sqlite";
    const migratorModule = "drizzle-orm/bun-sqlite/migrator";
    const { Database } = requireBun(sqliteModule) as BunSqliteModule;
    const { drizzle } = requireBun(driverModule) as BunSqliteDriverModule;
    const { migrate } = requireBun(migratorModule) as BunSqliteMigratorModule;
    let bunOptions: { readonly?: boolean; readwrite?: boolean; create?: boolean } = { readwrite: true, create: true };
    if (options.readonly) bunOptions = { readonly: true };
    const connection = new Database(filename, bunOptions);
    // Match better-sqlite3's foreign-key enforcement and default lock wait.
    connection.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    // Drizzle 0.45 types Bun's run result as void, although its prepared query
    // forwards Statement.run() and Bun returns changes/lastInsertRowid. Preserve
    // the full schema and the metadata Homarr uses for conditional writes. Local
    // module contracts also avoid introducing Bun's global types into Next.js.
    const db = drizzle(connection, config);
    return {
      db,
      connection,
      migrate(migrationConfig) {
        migrate(db, migrationConfig);
      },
    };
  }

  const connection = new BetterSqlite3(filename, options);
  const db = drizzleSqlite(connection, config);
  return {
    db,
    connection,
    migrate(migrationConfig) {
      migrateBetterSqlite(db, migrationConfig);
    },
  };
};

export const createSqliteDb = <TSchema extends Record<string, unknown>>(config: SharedDrizzleConfig<TSchema>) =>
  openSqliteDatabase(dbEnv.URL, config).db;
