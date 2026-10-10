import { constants } from "node:fs";
import { chmod, copyFile, mkdtemp, open, rm, rmdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import type { Logger } from "drizzle-orm";
import { migrate as migrateSqlite } from "drizzle-orm/bun-sqlite/migrator";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { migrate as migratePostgres } from "drizzle-orm/node-postgres/migrator";
import type { PoolConfig } from "pg";

import {
  createDatabaseScope,
  createPostgresDb,
  createSharedDbConfig,
  createSqliteDb,
} from "@homarr/core/infrastructure/db";

import type { HomarrDatabase, HomarrDatabasePostgresql } from "./driver";
import { applyCustomMigrationsAsync } from "./migrations/custom";
import {
  assertMigrationHistory,
  assertSqliteMigrationHistory,
  migrationHistoryReadLimit,
} from "./migrations/compatibility";
import * as postgresqlSchema from "./schema/postgresql";
import * as sqliteSchema from "./schema/sqlite";

export type PersistenceConfig = { logger?: Logger } & (
  | { engine: "sqlite"; path: string; mode: "fresh" | "existing"; migrationsFolder?: string }
  | { engine: "postgresql"; connection: PoolConfig; migrationsFolder?: string }
);
export type PersistencePhase =
  | "configured"
  | "opening"
  | "open"
  | "migrating"
  | "schema-ready"
  | "ready"
  | "maintenance"
  | "closing"
  | "closed"
  | "failed";
type Connection =
  | { engine: "sqlite"; database: ReturnType<typeof createSqliteDb<typeof sqliteSchema>> }
  | { engine: "postgresql"; database: ReturnType<typeof createPostgresDb<typeof postgresqlSchema>> };

export type PersistenceDatabaseHandle =
  | { engine: "sqlite"; database: HomarrDatabase; schema: typeof sqliteSchema }
  | {
      engine: "postgresql";
      database: HomarrDatabasePostgresql;
      schema: typeof postgresqlSchema;
    };

const withScopedConnectionAsync = async <T>(
  current: Connection,
  operation: (resource: PersistenceDatabaseHandle) => T | Promise<T>,
): Promise<T> => {
  const scope = createDatabaseScope(current.database, { synchronousTransactions: current.engine === "sqlite" });
  try {
    return await operation(
      current.engine === "sqlite"
        ? { engine: "sqlite", database: scope.database as HomarrDatabase, schema: sqliteSchema }
        : { engine: "postgresql", database: scope.database as HomarrDatabasePostgresql, schema: postgresqlSchema },
    );
  } finally {
    scope.revoke();
    await scope.settleAsync();
  }
};

export const createPersistenceRuntime = (config: PersistenceConfig) => {
  let phase: PersistencePhase = "configured";
  let connection: Connection | undefined;
  let active = 0;
  const drains = new Set<() => void>();
  let maintenance: Promise<unknown> | undefined;
  let closing: Promise<void> | undefined;
  const requireConnection = () => {
    if (!connection) throw new Error("Persistence is not open");
    return connection;
  };
  const requireReady = () => {
    if (phase !== "ready") throw new Error(`Persistence is not ready (${phase})`);
    return requireConnection();
  };
  const leave = () => {
    active -= 1;
    if (active === 0) {
      for (const drain of drains) drain();
      drains.clear();
    }
  };
  const waitForIdle = () =>
    active === 0
      ? Promise.resolve()
      : new Promise<void>((resolveIdle) => {
          drains.add(resolveIdle);
        });
  const closeConnection = async () => {
    if (!connection) return;
    if (connection.engine === "sqlite") connection.database.$client.close(true);
    else await connection.database.$client.end();
    connection = undefined;
  };
  const runAsync = async <T>(
    operation: (database: HomarrDatabase, schema: typeof sqliteSchema) => T | Promise<T>,
  ): Promise<T> => {
    const current = requireReady();
    active += 1;
    try {
      return await withScopedConnectionAsync(current, (resource) =>
        operation(resource.database as HomarrDatabase, resource.schema as typeof sqliteSchema),
      );
    } finally {
      leave();
    }
  };

  return {
    engine: config.engine,
    get phase() {
      return phase;
    },
    async openAsync() {
      if (phase !== "configured") throw new Error(`Persistence cannot open from ${phase}`);
      phase = "opening";
      try {
        if (config.engine === "sqlite") {
          if (config.path !== ":memory:") {
            if (config.mode === "fresh") {
              const file = await open(config.path, "wx", 0o600);
              await file.close();
            } else if (!(await stat(config.path)).isFile())
              throw new TypeError("SQLite requires an existing regular file");
          } else if (config.mode !== "fresh") throw new TypeError("An existing database cannot be in memory");
          connection = {
            engine: "sqlite",
            database: createSqliteDb(createSharedDbConfig(sqliteSchema, config.logger), { path: config.path }),
          };
        } else {
          const database = createPostgresDb(createSharedDbConfig(postgresqlSchema, config.logger), config.connection);
          connection = { engine: "postgresql", database };
          await database.execute(sql`SELECT 1`);
        }
        phase = "open";
      } catch (error) {
        phase = "failed";
        await closeConnection();
        throw error;
      }
    },
    async migrateSchemaAsync() {
      if (phase !== "open") throw new Error(`Persistence cannot migrate from ${phase}`);
      const current = requireConnection();
      phase = "migrating";
      try {
        const migrationsFolder =
          config.migrationsFolder ??
          fileURLToPath(
            new URL(`./migrations/${config.engine === "sqlite" ? "sqlite" : "postgresql"}/`, import.meta.url),
          );
        if (current.engine === "sqlite") {
          if (config.engine === "sqlite" && config.mode === "existing") {
            assertSqliteMigrationHistory(
              current.database.$client
                .query<{ hash: string; created_at: number }, [number]>(
                  "SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at LIMIT ?",
                )
                .all(migrationHistoryReadLimit(migrationsFolder)),
              migrationsFolder,
            );
          }
          migrateSqlite(current.database as unknown as BunSQLiteDatabase<typeof sqliteSchema>, { migrationsFolder });
        } else {
          const registry = await current.database.execute<{ ledger: string | null; users: string | null }>(
            sql`SELECT to_regclass('drizzle.__drizzle_migrations') AS ledger, to_regclass('public."user"') AS users`,
          );
          const existing = registry.rows[0];
          if (existing?.ledger) {
            const history = await current.database.execute<{ hash: string; created_at: string }>(
              sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at LIMIT ${migrationHistoryReadLimit(migrationsFolder)}`,
            );
            if (history.rows.length > 0 || existing.users)
              assertMigrationHistory(history.rows, migrationsFolder, "PostgreSQL");
          } else if (existing?.users) throw new Error("Existing PostgreSQL content has no supported migration ledger");
          await migratePostgres(current.database, { migrationsFolder });
        }
        phase = "schema-ready";
      } catch (error) {
        phase = "failed";
        throw error;
      }
    },
    async migrateContentAsync(options: { initializeFreshAsync?: (database: HomarrDatabase) => Promise<void> } = {}) {
      if (phase !== "schema-ready") throw new Error(`Persistence cannot migrate content from ${phase}`);
      if (options.initializeFreshAsync && (config.engine !== "sqlite" || config.mode !== "fresh"))
        throw new Error("Initialization is only permitted for a fresh SQLite resource");
      const current = requireConnection();
      phase = "migrating";
      try {
        if (options.initializeFreshAsync && current.engine === "sqlite")
          await withScopedConnectionAsync(current, (resource) =>
            options.initializeFreshAsync?.(resource.database as HomarrDatabase),
          );
        await applyCustomMigrationsAsync(current.database as unknown as HomarrDatabase);
        phase = "ready";
      } catch (error) {
        phase = "failed";
        throw error;
      }
    },
    async migrateAsync(options: { initializeFreshAsync?: (database: HomarrDatabase) => Promise<void> } = {}) {
      await this.migrateSchemaAsync();
      await this.migrateContentAsync(options);
    },
    runAsync,
    async checkReadinessAsync(): Promise<{ engine: "sqlite" | "postgresql"; phase: PersistencePhase; ready: boolean }> {
      if (phase !== "ready") return { engine: config.engine, phase, ready: false };
      try {
        const current = requireReady();
        active += 1;
        try {
          if (current.engine === "sqlite") current.database.get(sql`SELECT 1`);
          else await current.database.execute(sql`SELECT 1`);
        } finally {
          leave();
        }
        return { engine: config.engine, phase, ready: phase === "ready" };
      } catch {
        return { engine: config.engine, phase, ready: false };
      }
    },
    async withDatabaseAsync<T>(operation: (resource: PersistenceDatabaseHandle) => T | Promise<T>): Promise<T> {
      const current = requireReady();
      active += 1;
      try {
        return await withScopedConnectionAsync(current, operation);
      } finally {
        leave();
      }
    },
    transactionSync<T>(
      operation: (database: HomarrDatabase) => T,
      behavior: "deferred" | "immediate" | "exclusive" = "deferred",
    ): T {
      const current = requireReady();
      if (current.engine !== "sqlite") throw new TypeError("Use transactionAsync for PostgreSQL");
      active += 1;
      try {
        return current.database.transaction(operation, { behavior });
      } finally {
        leave();
      }
    },
    async transactionAsync<T>(operation: (database: HomarrDatabasePostgresql) => Promise<T>): Promise<T> {
      const current = requireReady();
      if (current.engine !== "postgresql") throw new TypeError("SQLite transactions must be synchronous");
      active += 1;
      try {
        return await current.database.transaction(async (transaction) => {
          const scope = createDatabaseScope(transaction, { synchronousTransactions: false });
          try {
            return await operation(scope.database);
          } finally {
            scope.revoke();
            await scope.settleAsync();
          }
        });
      } finally {
        leave();
      }
    },
    async maintenanceAsync<T>(operation: (resource: PersistenceDatabaseHandle) => T | Promise<T>): Promise<T> {
      const current = requireReady();
      phase = "maintenance";
      const pending = waitForIdle().then(async () => {
        active += 1;
        try {
          return await withScopedConnectionAsync(current, operation);
        } finally {
          leave();
          if (phase === "maintenance") phase = "ready";
        }
      });
      maintenance = pending;
      try {
        return await pending;
      } finally {
        if (maintenance === pending) maintenance = undefined;
      }
    },
    async snapshotSqliteAsync(destination: string): Promise<{ engine: "sqlite"; path: string }> {
      const current = requireReady();
      if (current.engine !== "sqlite") throw new TypeError("PostgreSQL snapshots require native PostgreSQL tooling");
      if (config.engine !== "sqlite" || resolve(destination) === resolve(config.path))
        throw new TypeError("Snapshot destination must differ from the database path");
      return this.maintenanceAsync(async () => {
        const directory = await mkdtemp(join(dirname(resolve(destination)), ".homarr-snapshot-"));
        const temporary = join(directory, "snapshot.sqlite");
        try {
          await chmod(directory, 0o700);
          current.database.run(sql`VACUUM INTO ${temporary}`);
          await chmod(temporary, 0o600);
          await copyFile(temporary, destination, constants.COPYFILE_EXCL);
          const snapshot = await open(destination, "r");
          try {
            await snapshot.sync();
          } finally {
            await snapshot.close();
          }
          return { engine: "sqlite" as const, path: destination };
        } finally {
          await rm(temporary, { force: true });
          await rmdir(directory);
        }
      });
    },
    closeAsync(): Promise<void> {
      if (closing) return closing;
      if (phase === "opening" || phase === "migrating")
        return Promise.reject(new Error(`Persistence cannot close during ${phase}`));
      phase = "closing";
      closing = (maintenance ?? Promise.resolve())
        .catch(() => undefined)
        .then(waitForIdle)
        .then(closeConnection)
        .then(() => {
          phase = "closed";
        });
      return closing;
    },
  };
};

export type PersistenceRuntime = ReturnType<typeof createPersistenceRuntime>;
