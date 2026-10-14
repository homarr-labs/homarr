import type { Database } from "bun:sqlite";
import { createTableRelationsHelpers, extractTablesRelationalConfig, is, SQL } from "drizzle-orm";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { SQLiteBunSession, SQLiteBunTransaction } from "drizzle-orm/bun-sqlite";
import { NodePgSession, NodePgTransaction } from "drizzle-orm/node-postgres";
import { PgDialect } from "drizzle-orm/pg-core";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import type { Client, Pool, QueryConfig, QueryResult } from "pg";

import { createDatabaseScope } from "@homarr/core/infrastructure/db";
import type { createSharedDbConfig, DatabaseScope } from "@homarr/core/infrastructure/db";

import type { HomarrDatabase, HomarrDatabasePostgresql } from "./driver";
import type { AuthSessionSqlResult, PreparedAuthSessionMutation } from "./runtime-auth-session/contracts";
import { executeAuthSessionMutationAsync, lockAuthCredentialDomainAsync } from "./runtime-auth-session/statements";
import type { CopiedCatalogReader } from "./copied-runtime-catalog";
import type { CopiedSqlRow, CopiedSqlValue } from "./copied-sqlite";
import { assertSqliteMainTarget } from "./main-target-catalog";
import { requireAuthCredentialClock } from "./runtime-auth-credential/validation";
import { rejectOnboarding } from "./runtime-onboarding/contracts";
import type {
  CapturedOnboardingMutation,
  OnboardingClaimResult,
  OnboardingNativePublicationBounds,
  OnboardingNativePublicationFacts,
} from "./runtime-onboarding/contracts";
import { onboardingStatements } from "./runtime-onboarding/statements";
import type { OnboardingExpiryWitness } from "./runtime-onboarding/statements";
import * as pgSchema from "./schema/postgresql";
import * as sqliteSchema from "./schema/sqlite";
import type { PreparedSqlitePreservationObservation, SqlitePreservationClock } from "./runtime-preservation";
import type { OnboardingCoreReadClock } from "./runtime-onboarding-read";

export interface BoundedTransactionOperation {
  signal: AbortSignal;
  lifetime: AbortSignal;
  deadlineAt: number;
}

export class TransactionCommitAmbiguousError extends Error {
  readonly code = "TRANSACTION_COMMIT_AMBIGUOUS";
  readonly retryable = false;

  constructor(cause: unknown) {
    super("Transaction COMMIT was dispatched; its durability outcome is ambiguous", { cause });
    this.name = "TransactionCommitAmbiguousError";
  }
}

type TransactionFailure = { kind: "none" } | { kind: "failed"; error: unknown };
type TransactionOutcome<T> = { kind: "success"; value: T } | { kind: "failed"; error: unknown };

export interface NativeOnboardingObservation {
  readonly kind: "native-onboarding-observation";
}

export type NativeOnboardingObservationFacts = Omit<OnboardingNativePublicationFacts, "runtimeGuard">;

interface NativeOnboardingObservationRecord {
  prepared: CapturedOnboardingMutation | undefined;
  resourceLifetime: AbortSignal | undefined;
  entered: boolean;
  readonly command: OnboardingNativePublicationFacts["command"];
  commit: OnboardingNativePublicationFacts["commit"];
  finalGate: OnboardingNativePublicationFacts["finalGate"];
  bounds: OnboardingNativePublicationBounds | null;
  unit: OnboardingNativePublicationFacts["unit"];
  cleanup: OnboardingNativePublicationFacts["cleanup"];
  failureStage: OnboardingNativePublicationFacts["failureStage"];
  cleanupFailureCount: number;
}

const nativeOnboardingObservations = new WeakMap<NativeOnboardingObservation, NativeOnboardingObservationRecord>();

export const prepareNativeOnboardingObservation = (
  prepared: CapturedOnboardingMutation,
  resourceLifetime: AbortSignal,
): NativeOnboardingObservation => {
  const handle: NativeOnboardingObservation = Object.freeze({ kind: "native-onboarding-observation" });
  nativeOnboardingObservations.set(handle, {
    prepared,
    resourceLifetime,
    entered: false,
    command: prepared.invocation.kind,
    commit: "not-dispatched",
    finalGate: "not-passed",
    bounds: null,
    unit: "pending",
    cleanup: "pending",
    failureStage: "none",
    cleanupFailureCount: 0,
  });
  return handle;
};

export const readNativeOnboardingObservation = (
  handle: NativeOnboardingObservation,
): NativeOnboardingObservationFacts | undefined => {
  const record = nativeOnboardingObservations.get(handle);
  if (!record) return undefined;
  return Object.freeze({
    command: record.command,
    commit: record.commit,
    finalGate: record.finalGate,
    bounds: record.bounds,
    unit: record.unit,
    cleanup: record.cleanup,
    failureStage: record.failureStage,
    cleanupFailureCount: record.cleanupFailureCount,
  });
};

export const disposeNativeOnboardingObservation = (handle: NativeOnboardingObservation): void => {
  nativeOnboardingObservations.delete(handle);
};

const enterNativeOnboardingObservation = (
  handle: NativeOnboardingObservation | undefined,
  prepared: CapturedOnboardingMutation,
  resourceLifetime: AbortSignal,
): NativeOnboardingObservationRecord | undefined => {
  if (!handle) return undefined;
  const record = nativeOnboardingObservations.get(handle);
  if (!record || record.entered || record.prepared !== prepared || record.resourceLifetime !== resourceLifetime)
    return rejectOnboarding();
  record.entered = true;
  record.prepared = undefined;
  record.resourceLifetime = undefined;
  return record;
};

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

interface TransactionGate {
  check(): number;
  commitCheck?(): void;
}

const runBoundedSqliteTransaction = <T>(
  client: Database,
  config: ReturnType<typeof createSharedDbConfig<typeof sqliteSchema>>,
  callback: (database: HomarrDatabase) => T,
  quarantine: (reason: unknown) => void,
  gate: TransactionGate,
  observation?: NativeOnboardingObservationRecord,
): T => {
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
    if (observation) {
      observation.cleanupFailureCount += 1;
      observation.cleanup = "failed";
      if (observation.failureStage === "none") observation.failureStage = "cleanup";
    }
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
  let failureStage: OnboardingNativePublicationFacts["failureStage"] = "admission";
  try {
    client.run("PRAGMA busy_timeout = 0");
    gate.check();
    client.run("BEGIN IMMEDIATE");
    begun = true;
    gate.check();
    failureStage = "body";
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
    if (gate.commitCheck) gate.commitCheck();
    else gate.check();
    failureStage = "commit";
    dispatched = true;
    if (observation) observation.commit = "dispatched-unconfirmed";
    client.run("COMMIT");
    if (observation) observation.commit = "acknowledged";
    begun = false;
    failureStage = "post-commit-guard";
    gate.check();
    outcome = { kind: "success", value: result };
  } catch (error) {
    if (observation && observation.failureStage === "none") observation.failureStage = failureStage;
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
  const settled = includeFailure(outcome, failures.failure);
  if (observation) {
    if (observation.cleanup === "pending") observation.cleanup = "complete";
    observation.unit = "returned";
    if (settled.kind === "failed" || cleanupErrors.length > 0) observation.unit = "rejected";
  }
  if (dispatched && (settled.kind === "failed" || cleanupErrors.length > 0))
    quarantine(new TransactionCommitAmbiguousError(settled.kind === "failed" ? settled.error : cleanupErrors));
  return finishTransaction(settled, cleanupErrors, dispatched);
};

export const boundedSqliteTransaction = <T>(
  client: Database,
  config: ReturnType<typeof createSharedDbConfig<typeof sqliteSchema>>,
  operation: BoundedTransactionOperation,
  resourceLifetime: AbortSignal,
  callback: (database: HomarrDatabase) => T,
  quarantine: (reason: unknown) => void,
): T => runBoundedSqliteTransaction(client, config, callback, quarantine, createGate(operation, resourceLifetime));

export const boundedSqlitePreservationObservation = (
  client: Database,
  config: ReturnType<typeof createSharedDbConfig<typeof sqliteSchema>>,
  clock: SqlitePreservationClock,
  read: () => PreparedSqlitePreservationObservation,
  quarantine: (reason: unknown) => void,
): PreparedSqlitePreservationObservation =>
  runBoundedSqliteTransaction(client, config, read, quarantine, {
    check: () => clock.check(),
    commitCheck() {
      clock.check();
    },
  });

export const boundedSqliteOnboardingCoreRead = (
  client: Database,
  config: ReturnType<typeof createSharedDbConfig<typeof sqliteSchema>>,
  clock: OnboardingCoreReadClock,
  read: () => void,
  commitCheck: () => void,
  quarantine: (reason: unknown) => void,
): void =>
  runBoundedSqliteTransaction(client, config, read, quarantine, {
    check: () => clock.check(),
    commitCheck() {
      clock.check();
      commitCheck();
      clock.check();
    },
  });

const postgresTransactionBegin = "BEGIN";
const postgresSnapshotBegin = "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY";

const runBoundedPostgresTransactionAsync = async <T>(
  pool: Pool,
  config: ReturnType<typeof createSharedDbConfig<typeof pgSchema>>,
  callback: (database: HomarrDatabasePostgresql) => Promise<T>,
  quarantine: (reason: unknown) => void,
  gate: TransactionGate,
  beginStatement: typeof postgresTransactionBegin | typeof postgresSnapshotBegin,
  admission?: "auth-establishment" | "onboarding",
  observation?: NativeOnboardingObservationRecord,
): Promise<T> => {
  const client = await pool.connect();
  let begun = false;
  let beginAttempted = false;
  let commitDispatched = false;
  let evict = false;
  const failures = createFailureCapture();
  const cleanupErrors: unknown[] = [];
  const cleanupFailed = (error: unknown) => {
    cleanupErrors.push(error);
    if (observation) {
      observation.cleanupFailureCount += 1;
      observation.cleanup = "failed";
      if (observation.failureStage === "none") observation.failureStage = "cleanup";
    }
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
  let failureStage: OnboardingNativePublicationFacts["failureStage"] = "admission";
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
    await client.query(beginStatement);
    begun = true;
    gate.check();
    if (admission === "auth-establishment" || admission === "onboarding") {
      const remaining = gate.check();
      await client.query("SELECT set_config('statement_timeout', $1, true), set_config('lock_timeout', $1, true)", [
        `${remaining}ms`,
      ]);
      gate.check();
      const isolation = await client.query<{ isolation: string }>(
        "SELECT current_setting('transaction_isolation') AS isolation",
      );
      if (isolation.rows.length !== 1 || isolation.rows[0]?.isolation !== "read committed")
        throw new TypeError("Auth establishment requires PostgreSQL READ COMMITTED");
      await lockAuthCredentialDomainAsync(scope.database);
      gate.check();
      for (const statement of [
        'LOCK TABLE "user" IN SHARE ROW EXCLUSIVE MODE',
        'LOCK TABLE "account" IN SHARE ROW EXCLUSIVE MODE',
        'LOCK TABLE "group" IN SHARE ROW EXCLUSIVE MODE',
        'LOCK TABLE "groupMember" IN SHARE ROW EXCLUSIVE MODE',
      ]) {
        const lockRemaining = gate.check();
        await client.query("SELECT set_config('statement_timeout', $1, true), set_config('lock_timeout', $1, true)", [
          `${lockRemaining}ms`,
        ]);
        gate.check();
        await client.query(statement);
        gate.check();
      }
      if (admission === "onboarding") {
        for (const statement of [
          'LOCK TABLE "groupPermission" IN SHARE ROW EXCLUSIVE MODE',
          'LOCK TABLE "session" IN SHARE ROW EXCLUSIVE MODE',
          'LOCK TABLE "apiKey" IN SHARE ROW EXCLUSIVE MODE',
          'LOCK TABLE "onboarding" IN SHARE ROW EXCLUSIVE MODE',
          'LOCK TABLE "serverSetting" IN SHARE ROW EXCLUSIVE MODE',
        ]) {
          const remaining = gate.check();
          await client.query("SELECT set_config('statement_timeout', $1, true), set_config('lock_timeout', $1, true)", [
            `${remaining}ms`,
          ]);
          gate.check();
          await client.query(statement);
          gate.check();
        }
      }
    }
    let result: T;
    try {
      failureStage = "body";
      result = await callback(scope.database);
    } finally {
      scope.revoke();
      await scope.settleAsync();
      await tail;
    }
    const failure = failures.failure;
    if (failure.kind === "failed") throw failure.error;
    if (gate.commitCheck) gate.commitCheck();
    else gate.check();
    failureStage = "commit";
    commitDispatched = true;
    if (observation) observation.commit = "dispatched-unconfirmed";
    await client.query("COMMIT");
    if (observation) observation.commit = "acknowledged";
    begun = false;
    failureStage = "post-commit-guard";
    gate.check();
    outcome = { kind: "success", value: result };
  } catch (error) {
    if (observation && observation.failureStage === "none") observation.failureStage = failureStage;
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
  const settled = includeFailure(outcome, failures.failure);
  if (observation) {
    if (observation.cleanup === "pending") observation.cleanup = "complete";
    observation.unit = "returned";
    if (settled.kind === "failed" || cleanupErrors.length > 0) observation.unit = "rejected";
  }
  if (commitDispatched && (settled.kind === "failed" || cleanupErrors.length > 0))
    quarantine(new TransactionCommitAmbiguousError(settled.kind === "failed" ? settled.error : cleanupErrors));
  return finishTransaction(settled, cleanupErrors, commitDispatched);
};

const createBoundedPostgresTransaction =
  (beginStatement: typeof postgresTransactionBegin | typeof postgresSnapshotBegin, admission?: "auth-establishment") =>
  async <T>(
    pool: Pool,
    config: ReturnType<typeof createSharedDbConfig<typeof pgSchema>>,
    operation: BoundedTransactionOperation,
    resourceLifetime: AbortSignal,
    callback: (database: HomarrDatabasePostgresql) => Promise<T>,
    quarantine: (reason: unknown) => void,
  ): Promise<T> =>
    runBoundedPostgresTransactionAsync(
      pool,
      config,
      callback,
      quarantine,
      createGate(operation, resourceLifetime),
      beginStatement,
      admission,
    );

export const boundedPostgresTransactionAsync = createBoundedPostgresTransaction(postgresTransactionBegin);
export const boundedPostgresSnapshotAsync = createBoundedPostgresTransaction(postgresSnapshotBegin);

const boundedPostgresAuthEstablishmentAsync = createBoundedPostgresTransaction(
  postgresTransactionBegin,
  "auth-establishment",
);

export const boundedPostgresAuthSessionMutationAsync = (
  pool: Pool,
  config: ReturnType<typeof createSharedDbConfig<typeof pgSchema>>,
  operation: BoundedTransactionOperation,
  resourceLifetime: AbortSignal,
  prepared: PreparedAuthSessionMutation,
  quarantine: (reason: unknown) => void,
): Promise<AuthSessionSqlResult> => {
  if (config.logger !== false) throw new TypeError("Auth session SQL logging must be disabled at the resource");
  return boundedPostgresAuthEstablishmentAsync(
    pool,
    config,
    operation,
    resourceLifetime,
    (database) => executeAuthSessionMutationAsync(database, prepared),
    quarantine,
  );
};

const createOnboardingGate = (
  prepared: CapturedOnboardingMutation,
  resourceLifetime: AbortSignal,
  observation?: NativeOnboardingObservationRecord,
) => {
  const { operation, configuration } = prepared;
  let wallDeadlineAt = operation.deadlineAt;
  let monotonicExpiresAt = Math.min(
    operation.originalMonotonicExpiresAt,
    operation.originalMonotonicStartedAt + (wallDeadlineAt - operation.originalWallStartedAt),
  );
  let lastObservedAt = operation.originalMonotonicStartedAt;
  let armed = false;
  const expiries: OnboardingExpiryWitness[] = [];
  const check = (): number => {
    resourceLifetime.throwIfAborted();
    operation.lifetime.throwIfAborted();
    operation.signal.throwIfAborted();
    const wall = requireAuthCredentialClock(Date.now(), configuration);
    const configured = configuration.now();
    requireAuthCredentialClock(configured, configuration);
    const now = Math.max(wall, configured);
    const monotonic = performance.now();
    if (!Number.isFinite(monotonic) || monotonic < lastObservedAt || !Number.isFinite(monotonicExpiresAt))
      return rejectOnboarding();
    lastObservedAt = monotonic;
    for (const expiry of expiries) {
      if (expiry.expiresAt <= now || (expiry.hostDeadlineAt !== null && expiry.hostDeadlineAt <= now))
        return rejectOnboarding();
    }
    const remaining = Math.min(
      operation.originalWallStartedAt + operation.originalBudgetMs - now,
      operation.originalMonotonicExpiresAt - monotonic,
      wallDeadlineAt - now,
      monotonicExpiresAt - monotonic,
    );
    if (!Number.isFinite(remaining) || remaining < 1) return rejectOnboarding();
    resourceLifetime.throwIfAborted();
    operation.lifetime.throwIfAborted();
    operation.signal.throwIfAborted();
    if (observation) {
      let claimExpiresAt: number | null = null;
      let session: OnboardingNativePublicationBounds["session"] = null;
      for (const expiry of expiries) {
        if (expiry.source === "claim") claimExpiresAt = expiry.expiresAt;
        if (expiry.source === "session" && expiry.hostDeadlineAt !== null)
          session = Object.freeze({ expiresAt: expiry.expiresAt, hostDeadlineAt: expiry.hostDeadlineAt });
      }
      observation.bounds = Object.freeze({
        originalWallStartedAt: operation.originalWallStartedAt,
        originalMonotonicStartedAt: operation.originalMonotonicStartedAt,
        originalBudgetMs: operation.originalBudgetMs,
        originalMonotonicExpiresAt: operation.originalMonotonicExpiresAt,
        originalDeadlineAt: operation.deadlineAt,
        effectiveWallDeadlineAt: wallDeadlineAt,
        effectiveMonotonicExpiresAt: monotonicExpiresAt,
        maximumAbsoluteClockSkewMs: configuration.maximumAbsoluteClockSkewMs,
        lastNativeMonotonicAt: monotonic,
        claimExpiresAt,
        session,
      });
    }
    return Math.min(2147483647, Math.floor(remaining));
  };
  check();
  return {
    check,
    observe(expiry: OnboardingExpiryWitness) {
      const previous = expiries.find((value) => value.source === expiry.source);
      if (previous && (previous.expiresAt !== expiry.expiresAt || previous.hostDeadlineAt !== expiry.hostDeadlineAt))
        return rejectOnboarding();
      let deadline = expiry.expiresAt - configuration.maximumAbsoluteClockSkewMs;
      if (expiry.hostDeadlineAt !== null) deadline = Math.min(deadline, expiry.hostDeadlineAt);
      if (!Number.isFinite(deadline)) return rejectOnboarding();
      wallDeadlineAt = Math.min(wallDeadlineAt, deadline);
      monotonicExpiresAt = Math.min(
        monotonicExpiresAt,
        operation.originalMonotonicExpiresAt,
        operation.originalMonotonicStartedAt + (deadline - operation.originalWallStartedAt),
      );
      if (!previous) expiries.push(Object.freeze({ ...expiry }));
      check();
    },
    arm() {
      check();
      armed = true;
    },
    commitCheck() {
      if (!armed) return rejectOnboarding();
      check();
      if (observation) observation.finalGate = "passed";
    },
  };
};

const assertOnboardingSqliteTarget = (
  client: Database,
  migrationsFolder: string,
  gate: TransactionGate,
  quarantine: (reason: unknown) => void,
  observation?: NativeOnboardingObservationRecord,
) => {
  let nativeFailed = false;
  const guardFailures = new Set<unknown>();
  const check = () => {
    try {
      gate.check();
      if (!client.inTransaction) return rejectOnboarding();
    } catch (error) {
      guardFailures.add(error);
      throw error;
    }
  };
  const reader: CopiedCatalogReader = {
    all(query, values = []) {
      check();
      const statement = client.prepare<CopiedSqlRow, CopiedSqlValue[]>(query);
      const cleanupErrors: unknown[] = [];
      let outcome: TransactionOutcome<CopiedSqlRow[]>;
      try {
        check();
        const rows = statement.all(...values);
        check();
        outcome = { kind: "success", value: rows };
      } catch (error) {
        if (!guardFailures.has(error)) nativeFailed = true;
        if (observation && observation.failureStage === "none") observation.failureStage = "body";
        outcome = { kind: "failed", error };
      } finally {
        try {
          statement.finalize();
        } catch (error) {
          cleanupErrors.push(error);
          if (observation) {
            observation.cleanupFailureCount += 1;
            observation.cleanup = "failed";
            if (observation.failureStage === "none") observation.failureStage = "cleanup";
          }
          nativeFailed = true;
          quarantine(error);
        }
        try {
          check();
        } catch (error) {
          cleanupErrors.push(error);
          if (observation) {
            observation.cleanupFailureCount += 1;
            observation.cleanup = "failed";
            if (observation.failureStage === "none") observation.failureStage = "cleanup";
          }
        }
      }
      return finishTransaction(outcome, cleanupErrors, false);
    },
    *iterate(query, values = []) {
      check();
      const statement = client.prepare<CopiedSqlRow, CopiedSqlValue[]>(query);
      let iterator: IterableIterator<CopiedSqlRow> | undefined;
      let outcome: TransactionOutcome<void> = { kind: "success", value: undefined };
      const cleanupErrors: unknown[] = [];
      try {
        check();
        iterator = statement.iterate(...values);
        for (;;) {
          check();
          const step = iterator.next();
          check();
          if (step.done) break;
          yield step.value;
        }
      } catch (error) {
        if (!guardFailures.has(error)) nativeFailed = true;
        if (observation && observation.failureStage === "none") observation.failureStage = "body";
        outcome = { kind: "failed", error };
      } finally {
        try {
          iterator?.return?.();
        } catch (error) {
          cleanupErrors.push(error);
          if (observation) {
            observation.cleanupFailureCount += 1;
            observation.cleanup = "failed";
            if (observation.failureStage === "none") observation.failureStage = "cleanup";
          }
          nativeFailed = true;
          quarantine(error);
        }
        try {
          statement.finalize();
        } catch (error) {
          cleanupErrors.push(error);
          if (observation) {
            observation.cleanupFailureCount += 1;
            observation.cleanup = "failed";
            if (observation.failureStage === "none") observation.failureStage = "cleanup";
          }
          nativeFailed = true;
          quarantine(error);
        }
        try {
          check();
        } catch (error) {
          cleanupErrors.push(error);
          if (observation) {
            observation.cleanupFailureCount += 1;
            observation.cleanup = "failed";
            if (observation.failureStage === "none") observation.failureStage = "cleanup";
          }
        }
        finishTransaction(outcome, cleanupErrors, false);
      }
    },
  };
  check();
  try {
    assertSqliteMainTarget(reader, migrationsFolder);
    check();
  } catch (error) {
    if (observation && observation.failureStage === "none") observation.failureStage = "body";
    if (nativeFailed || !guardFailures.has(error)) quarantine(error);
    throw error;
  }
};

export const boundedSqliteOnboardingMutation = (
  client: Database,
  config: ReturnType<typeof createSharedDbConfig<typeof sqliteSchema>>,
  resourceLifetime: AbortSignal,
  prepared: CapturedOnboardingMutation,
  migrationsFolder: string,
  quarantine: (reason: unknown) => void,
  observed?: NativeOnboardingObservation,
): OnboardingClaimResult | void => {
  if (config.logger !== false) throw new TypeError("Onboarding SQL logging must be disabled at the resource");
  const observation = enterNativeOnboardingObservation(observed, prepared, resourceLifetime);
  const gate = createOnboardingGate(prepared, resourceLifetime, observation);
  return runBoundedSqliteTransaction(
    client,
    config,
    (database) => {
      assertOnboardingSqliteTarget(client, migrationsFolder, gate, quarantine, observation);
      const statements = onboardingStatements("sqlite", prepared);
      let step = statements.next();
      while (!step.done) {
        gate.check();
        if (is(step.value, SQL)) step = statements.next(database.all<unknown>(step.value));
        else {
          gate.observe(step.value);
          step = statements.next([]);
        }
        gate.check();
      }
      assertOnboardingSqliteTarget(client, migrationsFolder, gate, quarantine, observation);
      gate.arm();
      return step.value;
    },
    quarantine,
    gate,
    observation,
  );
};

export const boundedPostgresOnboardingMutationAsync = (
  pool: Pool,
  config: ReturnType<typeof createSharedDbConfig<typeof pgSchema>>,
  resourceLifetime: AbortSignal,
  prepared: CapturedOnboardingMutation,
  quarantine: (reason: unknown) => void,
  observed?: NativeOnboardingObservation,
): Promise<OnboardingClaimResult | void> => {
  if (config.logger !== false) throw new TypeError("Onboarding SQL logging must be disabled at the resource");
  const observation = enterNativeOnboardingObservation(observed, prepared, resourceLifetime);
  const gate = createOnboardingGate(prepared, resourceLifetime, observation);
  return runBoundedPostgresTransactionAsync(
    pool,
    config,
    async (database) => {
      const statements = onboardingStatements("postgresql", prepared);
      let step = statements.next();
      while (!step.done) {
        gate.check();
        if (is(step.value, SQL)) step = statements.next((await database.execute(step.value)).rows);
        else {
          gate.observe(step.value);
          step = statements.next([]);
        }
        gate.check();
      }
      gate.arm();
      return step.value;
    },
    quarantine,
    gate,
    postgresTransactionBegin,
    "onboarding",
    observation,
  );
};
