import { constants } from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { chmod, lstat, mkdtemp, open, readFile, rm, rmdir } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { SQLQueryBindings } from "bun:sqlite";

import { createSharedDbConfig, createSqliteDb } from "@homarr/core/infrastructure/db";

import { assertCopiedCatalogPrefix } from "./copied-runtime-catalog";
import type { CopiedCatalogReader } from "./copied-runtime-catalog";
import { assertSqliteMainTarget, readMainTargetBundle } from "./main-target-catalog";
import { applyCustomMigrationsAsync } from "./migrations/custom";
import { runtimeCatalog } from "./runtime-catalog";
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
  catalogIdentity?: string;
  resetEpoch?: string;
  disposal?: Promise<void>;
};

const abort = (signal?: AbortSignal) => signal?.throwIfAborted();

export const createSqliteCopyEngine = (config: { temporaryDirectory: string; migrationsFolder: string }) => {
  const temporaryDirectory = config.temporaryDirectory;
  const migrationsFolder = config.migrationsFolder;
  if (!isAbsolute(temporaryDirectory) || !isAbsolute(migrationsFolder))
    throw new TypeError("Copied SQLite resources require explicit absolute temporary and migration directories");
  const engineBundle = readMainTargetBundle("sqlite", migrationsFolder);
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
  const readerFor = (state: CopyState): CopiedCatalogReader => ({
    all(query, values = []) {
      return state.database.$client.query<CopiedSqlRow, SQLQueryBindings[]>(query).all(...values);
    },
    iterate(query, values = []) {
      return state.database.$client.query<CopiedSqlRow, SQLQueryBindings[]>(query).iterate(...values);
    },
  });
  const assertBundle = (state: CopyState) => {
    const bundle = readMainTargetBundle("sqlite", migrationsFolder);
    if (
      bundle.identity !== engineBundle.identity ||
      (state.catalogIdentity && state.catalogIdentity !== bundle.identity)
    )
      throw new Error("The configured copied SQLite migration bundle changed");
    return bundle.identity;
  };
  const assertPrefix = (state: CopyState) => {
    const identity = assertBundle(state);
    assertCopiedCatalogPrefix(readerFor(state), migrationsFolder);
    return identity;
  };
  const assertTarget = (state: CopyState, reader: CopiedCatalogReader) => {
    assertBundle(state);
    assertSqliteMainTarget(reader, migrationsFolder);
  };
  const assertNoTemporaryObjects = (reader: CopiedCatalogReader) => {
    if (reader.all("SELECT name FROM sqlite_temp_master LIMIT 1").length)
      throw new Error("Temporary objects are not supported for copied runtime reset or sealing");
  };
  const assertNoRuntimeReferrers = (reader: CopiedCatalogReader) => {
    const runtimeTables = new Set(Object.values(runtimeCatalog.sqlite.tables).map((table) => table.name));
    const placeholders = [...runtimeTables].map(() => "?").join(",");
    for (const table of reader.iterate("SELECT name FROM main.sqlite_master WHERE type = 'table'")) {
      if (typeof table.name !== "string") throw new Error("Unsupported copied database table");
      if (runtimeTables.has(table.name)) continue;
      if (
        reader.all(`SELECT id FROM pragma_foreign_key_list(?, ?) WHERE lower("table") IN (${placeholders}) LIMIT 1`, [
          table.name,
          "main",
          ...runtimeTables,
        ]).length
      )
        throw new Error("Runtime reset cannot change referenced non-runtime tables");
    }
  };
  const assertResetContents = (reader: CopiedCatalogReader, epoch: string) => {
    for (const query of [
      'SELECT 1 FROM main."homarr_runtime_history_entry" LIMIT 1',
      'SELECT 1 FROM main."homarr_runtime_history_stream" LIMIT 1',
      'SELECT 1 FROM main."homarr_runtime_state" LIMIT 1',
    ]) {
      if (reader.all(query).length) throw new Error("The copied runtime must be empty before sealing");
    }
    const expected = runtimeCatalog.initialMetaRows;
    const rows = reader.all(
      'SELECT id, epoch IS ? AS epoch_matches, epoch IS NULL AS epoch_is_null FROM main."homarr_runtime_meta" ORDER BY id LIMIT ?',
      [epoch, expected.length + 1],
    );
    if (
      rows.length !== expected.length ||
      rows.some((row, index) => {
        const target = expected[index];
        return (
          !target ||
          row.id !== target.id ||
          row.epoch_matches !== Number(target.epoch !== null) ||
          row.epoch_is_null !== Number(target.epoch === null)
        );
      })
    )
      throw new Error("The copied runtime epoch does not match its owned reset");
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
      if (!(await lstat(temporaryDirectory)).isDirectory())
        throw new TypeError("Copied SQLite parent must be a regular directory");
      const directory = await mkdtemp(join(temporaryDirectory, "homarr-sqlite-copy-"));
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
              const reader = readerFor(state);
              assertNoTemporaryObjects(reader);
              assertTarget(state, reader);
              if (transactionScope.getStore()?.active || state.database.$client.inTransaction)
                throw new Error("A copied runtime cannot be sealed inside a transaction");
              if (!state.resetEpoch) throw new Error("The copied runtime must be reset before sealing");
              assertNoRuntimeReferrers(reader);
              assertResetContents(reader, state.resetEpoch);
              state.database.$client.query("VACUUM INTO ?").run(join(directory, "snapshot.sqlite"));
              state.database.$client.close(true);
              state.closed = true;
              if ((await lstat(join(directory, "snapshot.sqlite"))).size > 512 * 1024 * 1024)
                throw new Error("Converted SQLite snapshot exceeds the copy bound");
              const snapshot = await readFile(join(directory, "snapshot.sqlite"));
              state.phase = "sealed";
              return { dialect: "sqlite", bytes: snapshot };
            } catch (error) {
              state.resetEpoch = undefined;
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
      state.catalogIdentity = assertPrefix(state);
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
        assertPrefix(state);
        migrate(drizzle(state.database.$client, createSharedDbConfig(schema)), { migrationsFolder });
        assertTarget(state, readerFor(state));
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
        assertTarget(state, readerFor(state));
        await applyCustomMigrationsAsync(state.database);
        abort(signal);
        assertTarget(state, readerFor(state));
        state.phase = "ready";
      } catch (error) {
        state.phase = "failed";
        throw error;
      }
    },
    async resetRuntimeAsync(copy: CopiedSqliteDatabase, signal?: AbortSignal): Promise<void> {
      const state = stateFor(copy);
      if (state.phase !== "ready") {
        assertAvailable(state);
        throw new Error("Copied content must be converted before runtime reset");
      }
      state.resetEpoch = undefined;
      try {
        assertAvailable(state);
        if (transactionScope.getStore()?.active || state.database.$client.inTransaction)
          throw new Error("A copied runtime cannot be reset inside a transaction");
        abort(signal);
        state.phase = "migrating";
        const reader = readerFor(state);
        assertNoTemporaryObjects(reader);
        assertTarget(state, reader);
        const epoch = randomUUID();
        state.database.transaction(
          () => {
            abort(signal);
            assertTarget(state, reader);
            assertNoRuntimeReferrers(reader);
            state.database.$client.query('DELETE FROM main."homarr_runtime_history_entry"').run();
            state.database.$client.query('DELETE FROM main."homarr_runtime_history_stream"').run();
            state.database.$client.query('DELETE FROM main."homarr_runtime_state"').run();
            state.database.$client.query('DELETE FROM main."homarr_runtime_meta"').run();
            state.database.$client
              .query('INSERT INTO main."homarr_runtime_meta" (id, epoch) VALUES (1, ?), (2, NULL)')
              .run(epoch);
            assertTarget(state, reader);
            assertResetContents(reader, epoch);
            abort(signal);
          },
          { behavior: "immediate" },
        );
        abort(signal);
        assertTarget(state, reader);
        assertResetContents(reader, epoch);
        state.resetEpoch = epoch;
        state.phase = "ready";
      } catch (error) {
        state.resetEpoch = undefined;
        state.phase = "failed";
        throw error;
      }
    },
  };
};
