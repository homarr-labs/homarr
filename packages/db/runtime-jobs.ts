import { sql } from "drizzle-orm";

import type { HomarrDatabase, HomarrDatabasePostgresql } from "./driver";
import { runtimeUninitializedEpoch } from "./runtime-catalog";
import { compileRuntimeJobStatement } from "./runtime-jobs/compiler";
import type { CompiledRuntimeJobStatement } from "./runtime-jobs/compiler";
import type { RuntimeJobSqlStatement, RuntimeJobsSqlOptions, RuntimeJobsSqlPort } from "./runtime-jobs/types";
import type { BoundedTransactionOperation } from "./runtime";

export type {
  RuntimeJobSqlStatement,
  RuntimeJobSqlValue,
  RuntimeJobsSqlLimits,
  RuntimeJobsSqlOptions,
  RuntimeJobsSqlPort,
} from "./runtime-jobs/types";

const readAffectedRows = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new TypeError("Invalid native jobs SQL affected-row count");
  return value;
};

const assertEpoch = (rows: unknown, epoch: string) => {
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error("Runtime SQL epoch is unavailable");
  const row: unknown = rows[0];
  if (typeof row !== "object" || row === null || !Object.hasOwn(row, "epoch") || Reflect.get(row, "epoch") !== epoch)
    throw new Error("Runtime SQL epoch changed");
};

export const createRuntimeJobsSqlPort = (options: RuntimeJobsSqlOptions): RuntimeJobsSqlPort => {
  const { runtime, epoch, lifetime } = options;
  const limits = Object.freeze({ ...options.limits });
  for (const key of [
    "operationTimeoutMs",
    "maxPendingOperations",
    "maxStatements",
    "maxStatementBytes",
    "maxBatchBytes",
    "maxParametersPerStatement",
    "maxResultRows",
    "maxResultBytes",
  ] as const) {
    const value = limits[key];
    if (!Number.isSafeInteger(value) || value <= 0)
      throw new TypeError("Jobs SQL limits must be positive safe integers");
  }
  if (limits.operationTimeoutMs > 2147483647) throw new RangeError("Jobs SQL operation timeout exceeds native limits");
  if (limits.maxParametersPerStatement > (runtime.engine === "postgresql" ? 65535 : 32766))
    throw new RangeError("Jobs SQL parameter limit exceeds native dialect limits");
  if (typeof epoch !== "string" || epoch.length === 0 || epoch === runtimeUninitializedEpoch || epoch.includes("\0"))
    throw new TypeError("Jobs SQL requires an initialized captured epoch");
  lifetime.throwIfAborted();
  const dialect = runtime.engine;
  let pending = 0;

  const beginOperation = () => {
    lifetime.throwIfAborted();
    if (pending >= limits.maxPendingOperations) throw new Error("Jobs SQL admission limit exceeded");
    const startedAt = performance.now();
    const deadlineAt = Date.now() + limits.operationTimeoutMs;
    if (!Number.isSafeInteger(deadlineAt)) throw new RangeError("Jobs SQL deadline is outside the supported range");
    const check = () => {
      lifetime.throwIfAborted();
      const remaining = Math.min(deadlineAt - Date.now(), limits.operationTimeoutMs - (performance.now() - startedAt));
      if (remaining < 1) throw new Error("Jobs SQL operation deadline expired");
      return Math.min(2147483647, Math.floor(remaining));
    };
    check();
    pending += 1;
    const operation = (): BoundedTransactionOperation => ({
      signal: lifetime,
      lifetime,
      deadlineAt: Math.min(deadlineAt, Date.now() + check()),
    });
    return {
      operation,
      check,
      finish: () => {
        pending -= 1;
      },
    };
  };

  const compileBatch = (statements: readonly RuntimeJobSqlStatement[]) => {
    if (!Array.isArray(statements) || statements.length > limits.maxStatements)
      throw new RangeError("Jobs SQL statement batch limit exceeded");
    let bytes = 0;
    return statements.map((statement) => {
      const compiled = compileRuntimeJobStatement(statement, dialect, limits);
      bytes += compiled.bytes;
      if (bytes > limits.maxBatchBytes) throw new RangeError("Jobs SQL batch byte limit exceeded");
      return compiled;
    });
  };

  const createResultReader = () => {
    let rowsRead = 0;
    let bytesRead = 0;
    return (rows: unknown): readonly Record<string, unknown>[] => {
      if (!Array.isArray(rows)) throw new TypeError("Invalid native jobs SQL rows");
      rowsRead += rows.length;
      if (rowsRead > limits.maxResultRows) throw new RangeError("Jobs SQL result row limit exceeded");
      return rows.map((row: unknown) => {
        if (typeof row !== "object" || row === null || Array.isArray(row))
          throw new TypeError("Invalid native jobs SQL row");
        const detached: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          if (value !== null && typeof value !== "string" && typeof value !== "boolean" && typeof value !== "number")
            throw new TypeError("Unsupported native jobs SQL scalar");
          if (typeof value === "number" && !Number.isFinite(value))
            throw new TypeError("Invalid native jobs SQL number");
          Object.defineProperty(detached, key, { value, enumerable: true, writable: true, configurable: true });
        }
        bytesRead += Buffer.byteLength(JSON.stringify(detached));
        if (bytesRead > limits.maxResultBytes) throw new RangeError("Jobs SQL result byte limit exceeded");
        return detached;
      });
    };
  };

  const checkSqliteEpoch = (database: HomarrDatabase) => {
    assertEpoch(database.all(sql`SELECT "epoch" FROM "homarr_runtime_meta" WHERE "id" = 1`), epoch);
  };

  const checkPostgresEpochAsync = async (database: HomarrDatabasePostgresql) => {
    const result = await database.execute(sql`SELECT "epoch" FROM "homarr_runtime_meta" WHERE "id" = 1 FOR SHARE`);
    assertEpoch(result.rows, epoch);
  };

  const runBoundedAsync = async <T>(
    statements: readonly RuntimeJobSqlStatement[],
    sqlite: (database: HomarrDatabase, statements: readonly CompiledRuntimeJobStatement[], check: () => number) => T,
    postgres: (
      database: HomarrDatabasePostgresql,
      statements: readonly CompiledRuntimeJobStatement[],
      check: () => number,
    ) => Promise<T>,
  ): Promise<T> => {
    const budget = beginOperation();
    try {
      const compiled = compileBatch(statements);
      budget.check();
      if (dialect === "sqlite") {
        return runtime.boundedTransactionSync(budget.operation(), (database) => {
          checkSqliteEpoch(database);
          budget.check();
          const result = sqlite(database, compiled, budget.check);
          budget.check();
          return result;
        });
      }
      return await runtime.boundedTransactionAsync(budget.operation(), async (database) => {
        await checkPostgresEpochAsync(database);
        budget.check();
        const result = await postgres(database, compiled, budget.check);
        budget.check();
        return result;
      });
    } finally {
      budget.finish();
    }
  };

  const port: RuntimeJobsSqlPort = {
    dialect,
    async queryAsync(statement) {
      const readRows = createResultReader();
      return runBoundedAsync(
        [statement],
        (database, statements, check) => {
          const compiled = statements[0];
          if (!compiled || !compiled.returnsRows)
            throw new TypeError("Jobs SQL query requires source row-returning grammar");
          check();
          const rows = readRows(database.all(compiled.query));
          check();
          return rows;
        },
        async (database, statements, check) => {
          const compiled = statements[0];
          if (!compiled || !compiled.returnsRows)
            throw new TypeError("Jobs SQL query requires source row-returning grammar");
          check();
          const result = await database.execute(compiled.query);
          check();
          return readRows(result.rows);
        },
      );
    },
    async executeTransactionAsync(statements) {
      return runBoundedAsync(
        statements,
        (database, compiled, check) => {
          const results: { affectedRows: number }[] = [];
          for (const statement of compiled) {
            if (statement.kind !== "write")
              throw new TypeError("Jobs SQL effect batches require source mutation grammar");
            check();
            const result = database.run(statement.query);
            check();
            results.push({ affectedRows: readAffectedRows(result.changes) });
          }
          return results;
        },
        async (database, compiled, check) => {
          const results: { affectedRows: number }[] = [];
          for (const statement of compiled) {
            if (statement.kind !== "write")
              throw new TypeError("Jobs SQL effect batches require source mutation grammar");
            check();
            const result = await database.execute(statement.query);
            check();
            results.push({ affectedRows: readAffectedRows(result.rowCount) });
          }
          return results;
        },
      );
    },
    async querySnapshotAsync(statements) {
      const budget = beginOperation();
      try {
        const compiled = compileBatch(statements);
        if (compiled.some((statement) => statement.kind !== "read"))
          throw new TypeError("Jobs SQL snapshots require source SELECT grammar");
        const readRows = createResultReader();
        budget.check();
        if (dialect === "sqlite") {
          return runtime.boundedTransactionSync(budget.operation(), (database) => {
            checkSqliteEpoch(database);
            budget.check();
            const rowSets = compiled.map((statement) => {
              budget.check();
              const rows = readRows(database.all(statement.query));
              budget.check();
              return rows;
            });
            budget.check();
            return rowSets;
          });
        }
        const result = await runtime.boundedSnapshotAsync(budget.operation(), async (database) => {
          budget.check();
          const epochRows = await database.execute(sql`SELECT "epoch" FROM "homarr_runtime_meta" WHERE "id" = 1`);
          budget.check();
          assertEpoch(epochRows.rows, epoch);
          const rowSets: (readonly Record<string, unknown>[])[] = [];
          for (const statement of compiled) {
            budget.check();
            const rows = await database.execute(statement.query);
            budget.check();
            rowSets.push(readRows(rows.rows));
          }
          budget.check();
          return rowSets;
        });
        budget.check();
        return result;
      } finally {
        budget.finish();
      }
    },
  };
  return Object.freeze(port);
};
