import type { Database } from "bun:sqlite";
import { createTableRelationsHelpers, extractTablesRelationalConfig } from "drizzle-orm";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { SQLiteBunSession, SQLiteBunTransaction } from "drizzle-orm/bun-sqlite";
import { NodePgSession, NodePgTransaction } from "drizzle-orm/node-postgres";
import { PgDialect } from "drizzle-orm/pg-core";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import type { Client, Pool, QueryConfig, QueryResult } from "pg";

import { createDatabaseScope } from "@homarr/core/infrastructure/db";
import type { createSharedDbConfig, DatabaseScope } from "@homarr/core/infrastructure/db";

import type { HomarrDatabase, HomarrDatabasePostgresql } from "./driver";
import * as pgSchema from "./schema/postgresql";
import * as sqliteSchema from "./schema/sqlite";

export interface BoundedTransactionOperation {
  signal: AbortSignal;
  lifetime: AbortSignal;
  deadlineAt: number;
}

export class TransactionCommitAmbiguousError extends Error {
  readonly code = "TRANSACTION_COMMIT_AMBIGUOUS";

  constructor(cause: unknown) {
    super("Transaction COMMIT was dispatched; its durability outcome is ambiguous", { cause });
    this.name = "TransactionCommitAmbiguousError";
  }
}

type TransactionFailure = { kind: "none" } | { kind: "failed"; error: unknown };
type TransactionOutcome<T> = { kind: "success"; value: T } | { kind: "failed"; error: unknown };

const createFailureCapture = () => {
  let failure: TransactionFailure = { kind: "none" };
  return {
    get failure() {
      return failure;
    },
    record(error: unknown) {
      if (failure.kind === "none") failure = { kind: "failed", error };
    },
  };
};

const finishTransaction = <T>(
  outcome: TransactionOutcome<T>,
  cleanupErrors: readonly unknown[],
  commitDispatched: boolean,
): T => {
  const errors = outcome.kind === "failed" ? [outcome.error, ...cleanupErrors] : [...cleanupErrors];
  if (errors.length > 0) {
    const cause =
      errors.length === 1
        ? errors[0]
        : new AggregateError(errors, "Transaction and cleanup failures", { cause: errors[0] });
    if (commitDispatched) throw new TransactionCommitAmbiguousError(cause);
    throw cause;
  }
  if (outcome.kind === "failed") throw outcome.error;
  return outcome.value;
};

const includeFailure = <T>(outcome: TransactionOutcome<T>, failure: TransactionFailure): TransactionOutcome<T> => {
  if (failure.kind === "none") return outcome;
  if (outcome.kind === "success") return { kind: "failed", error: failure.error };
  if (outcome.error === failure.error) return outcome;
  return {
    kind: "failed",
    error: new AggregateError([failure.error, outcome.error], "Scoped execution and transaction failures", {
      cause: failure.error,
    }),
  };
};

const createGate = (operation: BoundedTransactionOperation, resourceLifetime: AbortSignal) => {
  const { signal, lifetime, deadlineAt } = operation;
  if (!Number.isFinite(deadlineAt)) throw new TypeError("Transaction deadline must be finite");
  const startedAt = performance.now();
  const budget = deadlineAt - Date.now();
  const check = () => {
    resourceLifetime.throwIfAborted();
    lifetime.throwIfAborted();
    signal.throwIfAborted();
    const remaining = Math.min(deadlineAt - Date.now(), budget - (performance.now() - startedAt));
    if (remaining < 1) throw new Error("Bounded transaction deadline expired");
    return Math.min(2147483647, Math.floor(remaining));
  };
  check();
  return { check };
};

const statementKind = (text: string): "statement" | "savepoint" | "rollback" => {
  let plain = "";
  for (let index = 0; index < text.length;) {
    const rest = text.slice(index);
    if (rest.startsWith("--")) {
      const end = text.indexOf("\n", index + 2);
      index = end < 0 ? text.length : end + 1;
      plain += " ";
    } else if (rest.startsWith("/*")) {
      let depth = 1;
      index += 2;
      while (depth > 0 && index < text.length) {
        if (text.slice(index, index + 2) === "/*") {
          depth += 1;
          index += 2;
        } else if (text.slice(index, index + 2) === "*/") {
          depth -= 1;
          index += 2;
        } else index += 1;
      }
      if (depth !== 0) throw new TypeError("Unterminated SQL comment");
      plain += " ";
    } else if (text[index] === "'" || text[index] === '"') {
      const quote = text[index];
      index += 1;
      let closed = false;
      while (index < text.length) {
        if (text[index] === "\\") throw new TypeError("Backslash SQL quoting is not supported by bounded transactions");
        if (text[index++] === quote) {
          if (text[index] === quote) index += 1;
          else {
            closed = true;
            break;
          }
        }
      }
      if (!closed) throw new TypeError("Unterminated SQL quote");
      plain += " quoted ";
    } else {
      const dollar = rest.match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/)?.[0];
      if (dollar) {
        const end = text.indexOf(dollar, index + dollar.length);
        if (end < 0) throw new TypeError("Unterminated SQL dollar quote");
        index = end + dollar.length;
        plain += " quoted ";
      } else plain += text[index++];
    }
  }
  const normalized = plain.trim().replace(/;\s*$/, "").trim().toLowerCase();
  if (normalized.includes(";")) throw new TypeError("Bounded transactions require one statement per execution");
  if (/^rollback to savepoint sp\d+$/.test(normalized)) return "rollback";
  if (/^(?:savepoint|release savepoint) sp\d+$/.test(normalized)) return "savepoint";
  if (!/^(?:select|with|insert|update|delete)\b/.test(normalized))
    throw new TypeError("Transaction control belongs to the bounded resource");
  return "statement";
};

const relationalSchema = <T extends Record<string, unknown>>(fullSchema: T) => {
  const extracted = extractTablesRelationalConfig(fullSchema, createTableRelationsHelpers);
  return {
    fullSchema,
    schema: extracted.tables as ExtractTablesWithRelations<T>,
    tableNamesMap: extracted.tableNamesMap,
  };
};

export const boundedSqliteTransaction = <T>(
  client: Database,
  config: ReturnType<typeof createSharedDbConfig<typeof sqliteSchema>>,
  operation: BoundedTransactionOperation,
  resourceLifetime: AbortSignal,
  callback: (database: HomarrDatabase) => T,
  quarantine: (reason: unknown) => void,
): T => {
  const gate = createGate(operation, resourceLifetime);
  if (client.inTransaction) throw new Error("Bounded transactions cannot join an existing native transaction");
  if (callback.constructor.name === "AsyncFunction")
    throw new TypeError("SQLite transactions require a synchronous callback");
  const timeout = client.query<{ timeout: number }, []>("PRAGMA busy_timeout").get()?.timeout;
  if (!Number.isSafeInteger(timeout) || timeout === undefined || timeout < 0)
    throw new Error("Invalid SQLite busy timeout");
  let begun = false;
  let dispatched = false;
  let unusable = false;
  const failures = createFailureCapture();
  const cleanupErrors: unknown[] = [];
  const cleanupFailed = (error: unknown) => {
    cleanupErrors.push(error);
    unusable = true;
    quarantine(error);
  };
  const schema = relationalSchema(sqliteSchema);
  const dialect = new SQLiteSyncDialect({ casing: config.casing });
  const session = new SQLiteBunSession(client, dialect, schema, {
    logger: {
      logQuery(query, parameters) {
        if (typeof config.logger === "object") config.logger.logQuery(query, parameters);
        if (statementKind(query) !== "rollback") gate.check();
      },
    },
  });
  const transaction = new SQLiteBunTransaction("sync", dialect, session, schema);
  const scope = createDatabaseScope(transaction, {
    synchronousTransactions: true,
    synchronousExecutions: true,
    onFailure: failures.record,
  });
  let outcome: TransactionOutcome<T>;
  try {
    client.run("PRAGMA busy_timeout = 0");
    gate.check();
    client.run("BEGIN IMMEDIATE");
    begun = true;
    gate.check();
    const result = callback(scope.database as unknown as HomarrDatabase);
    if (
      result !== null &&
      (typeof result === "object" || typeof result === "function") &&
      "then" in result &&
      typeof result.then === "function"
    ) {
      void Promise.resolve(result).catch(() => undefined);
      throw new TypeError("SQLite transaction callbacks cannot return a promise");
    }
    scope.revoke();
    const failure = failures.failure;
    if (failure.kind === "failed") throw failure.error;
    gate.check();
    dispatched = true;
    client.run("COMMIT");
    begun = false;
    gate.check();
    outcome = { kind: "success", value: result };
  } catch (error) {
    outcome = { kind: "failed", error };
    try {
      if (begun && client.inTransaction) client.run("ROLLBACK");
    } catch (rollbackError) {
      cleanupFailed(rollbackError);
    }
  } finally {
    scope.revoke();
    try {
      client.run(`PRAGMA busy_timeout = ${timeout}`);
    } catch (restorationError) {
      cleanupFailed(restorationError);
    }
    if (unusable) {
      try {
        client.close(true);
      } catch (closeError) {
        cleanupFailed(closeError);
      }
    }
  }
  return finishTransaction(includeFailure(outcome, failures.failure), cleanupErrors, dispatched);
};

export const boundedPostgresTransactionAsync = async <T>(
  pool: Pool,
  config: ReturnType<typeof createSharedDbConfig<typeof pgSchema>>,
  operation: BoundedTransactionOperation,
  resourceLifetime: AbortSignal,
  callback: (database: HomarrDatabasePostgresql) => Promise<T>,
  quarantine: (reason: unknown) => void,
): Promise<T> => {
  const gate = createGate(operation, resourceLifetime);
  const client = await pool.connect();
  let begun = false;
  let beginAttempted = false;
  let commitDispatched = false;
  let evict = false;
  const failures = createFailureCapture();
  const cleanupErrors: unknown[] = [];
  const cleanupFailed = (error: unknown) => {
    cleanupErrors.push(error);
    evict = true;
    quarantine(error);
  };
  let tail: Promise<unknown> = Promise.resolve();
  const onError = (error: Error) => {
    evict = true;
    failures.record(error);
  };
  let scope: DatabaseScope<HomarrDatabasePostgresql> | undefined;
  const queryAsync = (query: QueryConfig | string, parameters?: unknown[]): Promise<QueryResult> => {
    const task = tail.then(async () => {
      const kind = statementKind(typeof query === "string" ? query : query.text);
      if (kind !== "rollback") {
        const remaining = gate.check();
        await client.query("SELECT set_config('statement_timeout', $1, true), set_config('lock_timeout', $1, true)", [
          `${remaining}ms`,
        ]);
        gate.check();
      }
      return client.query(query, parameters);
    });
    tail = task.catch((error: unknown) => {
      failures.record(error);
    });
    return task;
  };
  const ownedClient = new Proxy(client, {
    get(target, property) {
      if (property === "query") return queryAsync;
      return Reflect.get(target, property, target);
    },
  });
  let outcome: TransactionOutcome<T>;
  try {
    client.on("error", onError);
    const connectionParameters: unknown = Reflect.get(client, "connectionParameters");
    if (
      typeof connectionParameters !== "object" ||
      connectionParameters === null ||
      Reflect.get(connectionParameters, "query_timeout")
    )
      throw new TypeError("Bounded PostgreSQL transactions do not support client-side query_timeout");
    gate.check();
    const schema = relationalSchema(pgSchema);
    const dialect = new PgDialect({ casing: config.casing });
    const session = new NodePgSession<typeof pgSchema, ExtractTablesWithRelations<typeof pgSchema>>(
      ownedClient,
      dialect,
      schema,
      {
        logger: typeof config.logger === "object" ? config.logger : undefined,
      },
    );
    const transaction = new NodePgTransaction<typeof pgSchema, ExtractTablesWithRelations<typeof pgSchema>>(
      dialect,
      session,
      schema,
    );
    scope = createDatabaseScope(transaction, { synchronousTransactions: false, onFailure: failures.record });
    gate.check();
    beginAttempted = true;
    await client.query("BEGIN");
    begun = true;
    gate.check();
    let result: T;
    try {
      result = await callback(scope.database);
    } finally {
      scope.revoke();
      await scope.settleAsync();
      await tail;
    }
    const failure = failures.failure;
    if (failure.kind === "failed") throw failure.error;
    gate.check();
    commitDispatched = true;
    await client.query("COMMIT");
    begun = false;
    gate.check();
    outcome = { kind: "success", value: result };
  } catch (error) {
    outcome = { kind: "failed", error };
    scope?.revoke();
    await scope?.settleAsync();
    await tail;
    if (commitDispatched) {
      evict = true;
    } else if (begun) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        cleanupFailed(rollbackError);
      }
    } else if (beginAttempted) evict = true;
  } finally {
    scope?.revoke();
    let ended = false;
    const endAsync = async () => {
      ended = true;
      try {
        await (client as unknown as Pick<Client, "end">).end();
      } catch (endError) {
        cleanupFailed(endError);
      }
    };
    if (evict) await endAsync();
    try {
      client.removeListener("error", onError);
    } catch (listenerError) {
      cleanupFailed(listenerError);
    }
    if (evict && !ended) await endAsync();
    try {
      client.release(evict);
    } catch (releaseError) {
      cleanupFailed(releaseError);
      if (!ended) await endAsync();
      try {
        client.release(true);
      } catch (evictionError) {
        cleanupFailed(evictionError);
      }
    }
  }
  return finishTransaction(includeFailure(outcome, failures.failure), cleanupErrors, commitDispatched);
};
