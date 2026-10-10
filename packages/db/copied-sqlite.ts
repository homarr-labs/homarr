import { constants } from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
import { chmod, lstat, mkdtemp, open, readFile, rm, rmdir } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getTableName, is } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import type { SQLQueryBindings } from "bun:sqlite";

import { createSharedDbConfig, createSqliteDb } from "@homarr/core/infrastructure/db";

import { assertSqliteMigrationHistory, migrationHistoryReadLimit } from "./migrations/compatibility";
import { applyCustomMigrationsAsync } from "./migrations/custom";
import * as schema from "./schema/sqlite";

export type CopiedSqlValue = string | number | bigint | Uint8Array | null;
export type CopiedSqlRow = Record<string, CopiedSqlValue>;

export interface CopiedSqliteDatabase {
  all(query: string, values?: CopiedSqlValue[]): CopiedSqlRow[];
  iterate(query: string, values?: CopiedSqlValue[]): Iterable<CopiedSqlRow>;
  run(query: string, values?: CopiedSqlValue[]): void;
  transaction(work: () => undefined): void;
  sealAsync(): Promise<{ dialect: "sqlite"; bytes: Uint8Array }>;
  disposeAsync(): Promise<void>;
}

type CopyState = {
  database: ReturnType<typeof createSqliteDb<typeof schema>>;
  directory: string;
  phase:
    | "copied"
    | "compatible"
    | "migrating"
    | "schema-ready"
    | "ready"
    | "sealing"
    | "sealed"
    | "disposing"
    | "disposed"
    | "failed";
  closed: boolean;
  disposal?: Promise<void>;
};

const abort = (signal?: AbortSignal) => signal?.throwIfAborted();

export const createSqliteCopyEngine = (config: { temporaryDirectory: string; migrationsFolder?: string }) => {
  if (!isAbsolute(config.temporaryDirectory))
    throw new TypeError("Copied SQLite resources require an explicit absolute temporary directory");
  const migrationsFolder = config.migrationsFolder ?? fileURLToPath(new URL("./migrations/sqlite/", import.meta.url));
  const copies = new WeakMap<CopiedSqliteDatabase, CopyState>();
  const transactionScope = new AsyncLocalStorage<{ active: boolean }>();
  const stateFor = (copy: CopiedSqliteDatabase) => {
    const state = copies.get(copy);
    if (!state) throw new Error("The copied resource belongs to another engine");
    return state;
  };
  const assertAvailable = (state: CopyState) => {
    if (transactionScope.getStore()?.active === false)
      throw new Error("The copied SQLite transaction is no longer active");
    if (state.closed || ["migrating", "sealing", "sealed", "disposing", "disposed", "failed"].includes(state.phase))
      throw new Error("The copied SQLite resource is not available");
  };
  return {
    async createCopyAsync(bytes: Uint8Array, signal?: AbortSignal): Promise<CopiedSqliteDatabase> {
      abort(signal);
      if (
        bytes.byteLength > 512 * 1024 * 1024 ||
        bytes.byteLength < 100 ||
        Buffer.from(bytes.subarray(0, 16)).toString("binary") !== "SQLite format 3\0"
      )
        throw new TypeError("Invalid copied SQLite image");
      if (!(await lstat(config.temporaryDirectory)).isDirectory())
        throw new TypeError("Copied SQLite parent must be a regular directory");
      const directory = await mkdtemp(join(config.temporaryDirectory, "homarr-sqlite-copy-"));
      const path = join(directory, "copy.sqlite");
      let database: CopyState["database"] | undefined;
      try {
        await chmod(directory, 0o700);
        const file = await open(
          path,
          constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
          0o600,
        );
        try {
          await file.writeFile(bytes);
          await file.sync();
        } finally {
          await file.close();
        }
        abort(signal);
        database = createSqliteDb(createSharedDbConfig(schema), { path });
        database.$client.exec("PRAGMA trusted_schema = OFF");
        const state: CopyState = { database, directory, phase: "copied", closed: false };
        const copy: CopiedSqliteDatabase = {
          all(query, values = []) {
            assertAvailable(state);
            return state.database.$client.query<CopiedSqlRow, SQLQueryBindings[]>(query).all(...values);
          },
          *iterate(query, values = []) {
            assertAvailable(state);
            const rows = state.database.$client.query<CopiedSqlRow, SQLQueryBindings[]>(query).iterate(...values);
            for (const row of rows) {
              assertAvailable(state);
              yield row;
            }
          },
          run(query, values = []) {
            assertAvailable(state);
            state.database.$client.query(query).run(...values);
          },
          transaction(work) {
            assertAvailable(state);
            const scope = { active: true };
            try {
              transactionScope.run(scope, () => state.database.transaction(work, { behavior: "immediate" }));
            } finally {
              scope.active = false;
            }
          },
          async sealAsync() {
            assertAvailable(state);
            if (state.phase !== "ready") throw new Error("Only a converted copied database can be sealed");
            state.phase = "sealing";
            try {
              state.database.$client.query("VACUUM INTO ?").run(join(directory, "snapshot.sqlite"));
              state.database.$client.close(true);
              state.closed = true;
              if ((await lstat(join(directory, "snapshot.sqlite"))).size > 512 * 1024 * 1024)
                throw new Error("Converted SQLite snapshot exceeds the copy bound");
              const snapshot = await readFile(join(directory, "snapshot.sqlite"));
              state.phase = "sealed";
              return { dialect: "sqlite", bytes: snapshot };
            } catch (error) {
              state.phase = "failed";
              throw error;
            }
          },
          disposeAsync() {
            if (state.disposal) return state.disposal;
            if (state.phase === "sealing" || state.phase === "migrating")
              return Promise.reject(new Error("Cannot dispose during copied database conversion or sealing"));
            state.phase = "disposing";
            state.disposal = (async () => {
              if (!state.closed) {
                state.database.$client.close(true);
                state.closed = true;
              }
              for (const filename of ["copy.sqlite", "snapshot.sqlite"]) {
                for (const suffix of ["", "-wal", "-shm", "-journal"])
                  await rm(join(directory, `${filename}${suffix}`), { force: true });
              }
              await rmdir(directory);
              state.phase = "disposed";
            })();
            return state.disposal;
          },
        };
        copies.set(copy, state);
        return copy;
      } catch (error) {
        database?.$client.close(true);
        for (const suffix of ["", "-wal", "-shm", "-journal"]) await rm(`${path}${suffix}`, { force: true });
        await rmdir(directory);
        throw error;
      }
    },
    async assertCompatibleAsync(
      metadata: { dbDialect: "sqlite"; homarrVersion: string; exportedAt: string },
      copy: CopiedSqliteDatabase,
      signal?: AbortSignal,
    ) {
      abort(signal);
      const state = stateFor(copy);
      assertAvailable(state);
      if (state.phase !== "copied" || metadata.dbDialect !== "sqlite")
        throw new Error("Unsupported copied database dialect or phase");
      const tables = new Set<string>(
        Object.values(schema)
          .filter((table) => is(table, SQLiteTable))
          .map((table) => getTableName(table)),
      );
      tables.add("__drizzle_migrations");
      for (const object of copy.iterate("SELECT type, name, tbl_name, sql FROM sqlite_master")) {
        const name = String(object.name);
        const table = String(object.tbl_name);
        if (object.type === "index" && object.sql === null && tables.has(table)) {
          const internal = copy.all("SELECT name, origin FROM pragma_index_list(?) WHERE name = ? LIMIT 2", [
            table,
            name,
          ]);
          if (
            name.startsWith(`sqlite_autoindex_${table}_`) &&
            /^[1-9]\d*$/.test(name.slice(`sqlite_autoindex_${table}_`.length)) &&
            internal.length === 1 &&
            (internal[0]?.origin === "pk" || internal[0]?.origin === "u")
          )
            continue;
        }
        if (
          object.type === "index" &&
          tables.has(table) &&
          typeof object.sql === "string" &&
          /^CREATE\s+(?:UNIQUE\s+)?INDEX\s/i.test(object.sql)
        )
          continue;
        if (
          object.type === "table" &&
          name === table &&
          tables.has(name) &&
          typeof object.sql === "string" &&
          /^CREATE\s+TABLE\s/i.test(object.sql)
        )
          continue;
        const statistics =
          name === "sqlite_stat1"
            ? ["tbl", "idx", "stat"]
            : name === "sqlite_stat4"
              ? ["tbl", "idx", "neq", "nlt", "ndlt", "sample"]
              : undefined;
        if (
          object.type === "table" &&
          name === table &&
          statistics &&
          object.sql === `CREATE TABLE ${name}(${statistics.join(",")})`
        ) {
          const columns = copy.all('SELECT name, type, pk, "notnull", dflt_value FROM pragma_table_info(?) LIMIT ?', [
            name,
            statistics.length + 1,
          ]);
          if (
            columns.length === statistics.length &&
            columns.every(
              (column, index) =>
                column.name === statistics[index] &&
                column.type === "" &&
                column.pk === 0 &&
                column.notnull === 0 &&
                column.dflt_value === null,
            )
          )
            continue;
        }
        throw new Error("Unsupported copied database schema object");
      }
      assertSqliteMigrationHistory(
        copy
          .all("SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at LIMIT ?", [
            migrationHistoryReadLimit(migrationsFolder),
          ])
          .map(({ hash, created_at }) => ({ hash, created_at })),
        migrationsFolder,
      );
      state.phase = "compatible";
    },
    async migrateSchemaAsync(copy: CopiedSqliteDatabase, signal?: AbortSignal) {
      abort(signal);
      const state = stateFor(copy);
      assertAvailable(state);
      if (state.phase !== "compatible")
        throw new Error("Copied database compatibility must be checked before migration");
      state.phase = "migrating";
      try {
        migrate(state.database as unknown as BunSQLiteDatabase<typeof schema>, { migrationsFolder });
        state.phase = "schema-ready";
      } catch (error) {
        state.phase = "failed";
        throw error;
      }
    },
    async migrateContentAsync(copy: CopiedSqliteDatabase, signal?: AbortSignal) {
      abort(signal);
      const state = stateFor(copy);
      assertAvailable(state);
      if (state.phase !== "schema-ready") throw new Error("Copied SQL schema must migrate before content conversion");
      state.phase = "migrating";
      try {
        await applyCustomMigrationsAsync(state.database);
        abort(signal);
        state.phase = "ready";
      } catch (error) {
        state.phase = "failed";
        throw error;
      }
    },
  };
};
