import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { DrizzleConfig } from "drizzle-orm";

import type { SqliteConnection, SqliteDatabase } from "@homarr/core/infrastructure/db";
import { dbEnv } from "@homarr/core/infrastructure/db/env";

// Bun server builds select this adapter instead of the dual Node/Bun adapter.
// Keeping the import static lets the assembler omit all Node SQLite bindings.
export function openSqliteDatabase<TSchema extends Record<string, unknown>>(
  filename: string,
  config: DrizzleConfig<TSchema>,
  options: { readonly?: boolean } = {},
) {
  let connectionOptions: { readonly?: boolean; readwrite?: boolean; create?: boolean } = {
    readwrite: true,
    create: true,
  };
  if (options.readonly) connectionOptions = { readonly: true };
  const connection = new Database(filename, connectionOptions);
  connection.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  const db = drizzle(connection, config);
  return {
    connection: connection as unknown as SqliteConnection,
    db: db as unknown as SqliteDatabase<TSchema>,
    migrate(migrationConfig: Parameters<typeof migrate>[1]) {
      migrate(db, migrationConfig);
    },
  };
}

export const createSqliteDb = <TSchema extends Record<string, unknown>>(config: DrizzleConfig<TSchema>) =>
  openSqliteDatabase(dbEnv.URL, config).db;

export type { SqliteConnection, SqliteDatabase };
