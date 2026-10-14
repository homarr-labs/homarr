import { constants } from "node:fs";
import { chmod, copyFile, mkdtemp, open, rm, rmdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { sql } from "drizzle-orm";
import type { Logger } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
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
import type { CopiedCatalogReader } from "./copied-runtime-catalog";
import type { CopiedSqlRow, CopiedSqlValue } from "./copied-sqlite";
import { assertSqliteMainTarget, readMainTargetBundle } from "./main-target-catalog";
import { captureAppMutation } from "./runtime-app/contracts";
import type { AppMutation, AppMutationResult } from "./runtime-app/contracts";
import { executeAppMutationSync } from "./runtime-app/statements";
import type {
  AuthCredentialAdoptionResult,
  NativeCredentialEvidence,
  NativeCredentialPolicyConfiguration,
} from "./runtime-auth-credential/contracts";
import {
  authCredentialAdoptionStatements,
  initializeAuthCredentialDomainStatements,
} from "./runtime-auth-credential/statements";
import {
  authCredentialMaximumRows,
  captureNativeCredentialEvidence,
  captureNativeCredentialPolicyConfiguration,
  requireAuthCredentialClock,
} from "./runtime-auth-credential/validation";
import { captureBoardPermissionsMutation } from "./runtime-board/contracts";
import type { BoardPermissionsMutation } from "./runtime-board/contracts";
import { executeBoardPermissionsMutationSync } from "./runtime-board/statements";
import { prepareAuthSessionMutation } from "./runtime-auth-session/contracts";
import type {
  AuthSessionMutation,
  AuthSessionSqlConfiguration,
  AuthSessionSqlResult,
} from "./runtime-auth-session/contracts";
import { executeAuthSessionMutationSync } from "./runtime-auth-session/statements";
import { captureOnboardingMutation, rejectOnboarding } from "./runtime-onboarding/contracts";
import type {
  OnboardingClaimInvocation,
  OnboardingClaimResult,
  OnboardingInitialExternalGroupInvocation,
  OnboardingInitUserInvocation,
  OnboardingInvocation,
  OnboardingNativePublicationFacts,
  OnboardingNativePublicationHandle,
  OnboardingNativePublicationRead,
  OnboardingNativePublicationReader,
  OnboardingNextStepInvocation,
  OnboardingObservedDispatch,
  OnboardingOperation,
  OnboardingSqlConfiguration,
  CapturedOnboardingMutation,
} from "./runtime-onboarding/contracts";
import { applyCustomMigrationsAsync } from "./migrations/custom";
import {
  assertMigrationHistory,
  assertSqliteMigrationHistory,
  migrationHistoryReadLimit,
} from "./migrations/compatibility";
import * as postgresqlSchema from "./schema/postgresql";
import * as sqliteSchema from "./schema/sqlite";
import {
  boundedPostgresAuthSessionMutationAsync,
  boundedPostgresOnboardingMutationAsync,
  boundedPostgresSnapshotAsync,
  boundedPostgresTransactionAsync,
  boundedSqliteTransaction,
  boundedSqliteOnboardingMutation,
  prepareNativeOnboardingObservation,
  readNativeOnboardingObservation,
  disposeNativeOnboardingObservation,
  TransactionCommitAmbiguousError,
} from "./transaction-gate";
import type { BoundedTransactionOperation } from "./transaction-gate";
import type { NativeOnboardingObservation, NativeOnboardingObservationFacts } from "./transaction-gate";
import { boundedSqlitePreservationObservation } from "./transaction-gate";
import {
  assertSqlitePreservationLedgerTransferBounds,
  captureSqlitePreservationOperation,
  discardPreparedSqlitePreservation,
  disposeNativeSqlitePreservationObservation,
  prepareSqlitePreservationRecords,
  publishSqlitePreservationObservation,
  SqlitePreservationClock,
} from "./runtime-preservation";
import type {
  NativeSqlitePreservationObservation,
  PreparedSqlitePreservationObservation,
  SqlitePreservationOperation,
} from "./runtime-preservation";
import {
  assertOnboardingCoreLedgerTransfer,
  captureOnboardingCoreRead,
  OnboardingCoreReadBody,
  OnboardingCoreReadClock,
} from "./runtime-onboarding-read";
import type {
  OnboardingCoreReadAuthority,
  OnboardingCoreReadConfiguration,
  OnboardingCoreReadResult,
  OnboardingCoreReadSelection,
} from "./runtime-onboarding-read";
import { boundedSqliteOnboardingCoreRead } from "./transaction-gate";

export { TransactionCommitAmbiguousError } from "./transaction-gate";
export type { BoundedTransactionOperation } from "./transaction-gate";
export {
  encodeNativeSqlitePreservationObservation,
  disposeNativeSqlitePreservationObservation,
} from "./runtime-preservation";
export type { NativeSqlitePreservationObservation, SqlitePreservationOperation } from "./runtime-preservation";
export { OnboardingPreconditionError } from "./runtime-onboarding/contracts";
export { OnboardingCoreReadError } from "./runtime-onboarding-read";
export type {
  OnboardingCoreReadAuthority,
  OnboardingCoreReadBoard,
  OnboardingCoreReadBounds,
  OnboardingCoreReadConfiguration,
  OnboardingCoreReadEnvironment,
  OnboardingCoreReadResult,
  OnboardingCoreReadSelection,
  OnboardingCoreReadStep,
} from "./runtime-onboarding-read";
export type {
  OnboardingClaimAuthority,
  OnboardingClaimInvocation,
  OnboardingClaimResult,
  OnboardingInitialExternalGroupInvocation,
  OnboardingInitUserInvocation,
  OnboardingInvocation,
  OnboardingNativePublicationBounds,
  OnboardingNativePublicationFacts,
  OnboardingNativePublicationHandle,
  OnboardingNativePublicationRead,
  OnboardingNativePublicationReader,
  OnboardingNextStepInvocation,
  OnboardingObservedDispatch,
  OnboardingOperation,
  OnboardingResults,
  OnboardingRetainedAuthority,
  OnboardingSqlConfiguration,
  OnboardingStepWitness,
} from "./runtime-onboarding/contracts";

export type PersistenceConfig = { logger?: Logger } & (
  | { engine: "sqlite"; path: string; mode: "fresh" | "existing"; migrationsFolder: string }
  | { engine: "postgresql"; connection: PoolConfig; migrationsFolder: string }
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

interface CredentialAdoptionOwner {
  readonly connection: Extract<Connection, { engine: "sqlite" }>;
  readonly lifetime: AbortController;
  domain: AuthCredentialAdoptionResult | undefined;
}

interface TargetOperationTiming {
  readonly startedAt: number;
  readonly budget: number;
  lastObservedAt: number;
}

const captureTargetOperationTiming = (operation: BoundedTransactionOperation): TargetOperationTiming => {
  const now = Date.now();
  const startedAt = performance.now();
  const budget = operation.deadlineAt - now;
  if (
    !Number.isFinite(operation.deadlineAt) ||
    !Number.isFinite(now) ||
    !Number.isFinite(startedAt) ||
    !Number.isFinite(budget)
  )
    throw new TypeError("Target observation requires finite clocks and deadline");
  return { startedAt, budget, lastObservedAt: startedAt };
};

const assertTargetOperation = (
  operation: BoundedTransactionOperation,
  ownerLifetime: AbortSignal,
  timing: TargetOperationTiming,
): void => {
  ownerLifetime.throwIfAborted();
  operation.lifetime.throwIfAborted();
  operation.signal.throwIfAborted();
  const now = Date.now();
  const observedAt = performance.now();
  if (!Number.isFinite(now) || !Number.isFinite(observedAt) || observedAt < timing.lastObservedAt)
    throw new Error("Target observation clock is invalid");
  timing.lastObservedAt = observedAt;
  if (Math.min(operation.deadlineAt - now, timing.budget - (observedAt - timing.startedAt)) < 1)
    throw new Error("Bounded target observation deadline expired");
};

const executeCredentialStatementsSync = <T>(
  database: HomarrDatabase,
  statements: Generator<SQL, T, readonly unknown[]>,
  operation: BoundedTransactionOperation,
  ownerLifetime: AbortSignal,
  timing: TargetOperationTiming,
): T => {
  assertTargetOperation(operation, ownerLifetime, timing);
  let step = statements.next();
  assertTargetOperation(operation, ownerLifetime, timing);
  while (!step.done) {
    const rows = database.all<unknown>(step.value);
    assertTargetOperation(operation, ownerLifetime, timing);
    step = statements.next(rows);
    assertTargetOperation(operation, ownerLifetime, timing);
  }
  return step.value;
};

const captureCredentialOperation = (
  operation: BoundedTransactionOperation,
  input: NativeCredentialEvidence,
  options: NativeCredentialPolicyConfiguration,
) => {
  const bounded = { signal: operation.signal, lifetime: operation.lifetime, deadlineAt: operation.deadlineAt };
  const credential = captureNativeCredentialEvidence(input);
  const configuration = captureNativeCredentialPolicyConfiguration(options);
  requireAuthCredentialClock(configuration.now(), configuration);
  if (!Number.isFinite(bounded.deadlineAt)) throw new TypeError("Transaction deadline must be finite");
  if (credential.type === "opaque-session")
    bounded.deadlineAt = Math.min(
      bounded.deadlineAt,
      credential.hostDeadlineAt,
      credential.expiresAt - configuration.maximumAbsoluteClockSkewMs,
    );
  return { operation: bounded, credential, configuration };
};

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

interface OnboardingPublicationAssociation {
  readonly owner: object;
  readonly operation: WeakRef<OnboardingOperation>;
  readonly invocation: WeakRef<OnboardingInvocation>;
}

interface OnboardingPublicationRecord extends OnboardingPublicationAssociation {
  readonly clock: WeakRef<() => number>;
  readonly maximumSnapshotRows: number;
  observation: NativeOnboardingObservation | undefined;
  nativeFacts: NativeOnboardingObservationFacts;
  runtimeGuard: OnboardingNativePublicationFacts["runtimeGuard"];
  unit: OnboardingNativePublicationFacts["unit"];
  failureStage: OnboardingNativePublicationFacts["failureStage"];
  settled: boolean;
  consumed: boolean;
}

interface OnboardingPublicationStore {
  readonly records: WeakMap<OnboardingNativePublicationHandle, OnboardingPublicationRecord>;
  readonly disposed: WeakMap<OnboardingNativePublicationHandle, OnboardingPublicationAssociation>;
}

const createOnboardingPublicationReader = (
  store: OnboardingPublicationStore,
  owner: object,
): OnboardingNativePublicationReader => {
  const matches = (
    association: OnboardingPublicationAssociation | undefined,
    operation: OnboardingOperation,
    invocation: OnboardingInvocation,
  ): association is OnboardingPublicationAssociation =>
    association !== undefined &&
    association.owner === owner &&
    association.operation.deref() === operation &&
    association.invocation.deref() === invocation;
  const lookup = (
    handle: OnboardingNativePublicationHandle,
    operation: OnboardingOperation,
    invocation: OnboardingInvocation,
  ): OnboardingPublicationRecord => {
    const record = store.records.get(handle);
    if (!record || !matches(record, operation, invocation)) return rejectOnboarding();
    return record;
  };
  const read = (
    handle: OnboardingNativePublicationHandle,
    operation: OnboardingOperation,
    invocation: OnboardingInvocation,
  ): OnboardingNativePublicationRead => {
    const record = lookup(handle, operation, invocation);
    let nativeFacts = record.nativeFacts;
    if (record.observation) nativeFacts = readNativeOnboardingObservation(record.observation) ?? nativeFacts;
    let failureStage = nativeFacts.failureStage;
    if (failureStage === "none") failureStage = record.failureStage;
    const facts: OnboardingNativePublicationFacts = Object.freeze({
      ...nativeFacts,
      runtimeGuard: record.runtimeGuard,
      unit: record.unit,
      failureStage,
    });
    if (!record.settled) return Object.freeze({ kind: "pending", facts });
    const bounds = facts.bounds;
    const clock = record.clock.deref();
    if (!bounds || !clock) return Object.freeze({ kind: "settled", facts, temporal: "clock-unavailable" });
    let temporal: Extract<OnboardingNativePublicationRead, { readonly kind: "settled" }>["temporal"] = "clock-invalid";
    try {
      const configuration = captureNativeCredentialPolicyConfiguration({
        maximumSnapshotRows: record.maximumSnapshotRows,
        maximumAbsoluteClockSkewMs: bounds.maximumAbsoluteClockSkewMs,
        now: clock,
      });
      const wall = requireAuthCredentialClock(Date.now(), configuration);
      const configured = requireAuthCredentialClock(clock(), configuration);
      const now = Math.max(wall, configured);
      const monotonic = performance.now();
      if (
        Number.isFinite(monotonic) &&
        monotonic >= bounds.originalMonotonicStartedAt &&
        monotonic >= bounds.lastNativeMonotonicAt
      ) {
        const remaining = Math.min(
          bounds.originalWallStartedAt + bounds.originalBudgetMs - now,
          bounds.originalMonotonicExpiresAt - monotonic,
          bounds.effectiveWallDeadlineAt - now,
          bounds.effectiveMonotonicExpiresAt - monotonic,
        );
        temporal = "within-original-and-observed-bounds";
        if (!Number.isFinite(remaining)) temporal = "clock-invalid";
        else if (
          remaining < 1 ||
          (bounds.claimExpiresAt !== null && bounds.claimExpiresAt <= now) ||
          (bounds.session !== null && (bounds.session.expiresAt <= now || bounds.session.hostDeadlineAt <= now))
        )
          temporal = "expired";
      }
    } catch {
      temporal = "clock-invalid";
    }
    lookup(handle, operation, invocation);
    return Object.freeze({ kind: "settled", facts, temporal });
  };
  return Object.freeze({
    readOnboardingNativePublication: read,
    consumeOnboardingNativePublication(
      handle: OnboardingNativePublicationHandle,
      operation: OnboardingOperation,
      invocation: OnboardingInvocation,
    ): Extract<OnboardingNativePublicationRead, { readonly kind: "settled" }> {
      const record = lookup(handle, operation, invocation);
      if (record.consumed) return rejectOnboarding();
      const result = read(handle, operation, invocation);
      if (result.kind !== "settled" || lookup(handle, operation, invocation) !== record || record.consumed)
        return rejectOnboarding();
      record.consumed = true;
      return result;
    },
    disposeOnboardingNativePublication(
      handle: OnboardingNativePublicationHandle,
      operation: OnboardingOperation,
      invocation: OnboardingInvocation,
    ): void {
      const record = store.records.get(handle);
      if (!record) {
        if (!matches(store.disposed.get(handle), operation, invocation)) return rejectOnboarding();
        return;
      }
      if (!matches(record, operation, invocation)) return rejectOnboarding();
      record.consumed = true;
      store.disposed.set(handle, { owner, operation: record.operation, invocation: record.invocation });
      store.records.delete(handle);
    },
  });
};

export const createPersistenceRuntime = (input: PersistenceConfig) => {
  const capturedMigrationsFolder = input.migrationsFolder;
  const engine = input.engine;
  const logger = input.logger;
  if (
    typeof capturedMigrationsFolder !== "string" ||
    capturedMigrationsFolder.length === 0 ||
    !isAbsolute(capturedMigrationsFolder)
  )
    throw new TypeError("Persistence requires an explicit absolute migrations folder");
  let config: PersistenceConfig;
  if (engine === "sqlite") {
    const { path, mode } = input;
    config = Object.freeze({ engine, logger, path, mode, migrationsFolder: capturedMigrationsFolder });
  } else {
    const connectionOptions = input.connection;
    config = Object.freeze({
      engine,
      logger,
      connection: Object.freeze({ ...connectionOptions }),
      migrationsFolder: capturedMigrationsFolder,
    });
  }
  let phase: PersistencePhase = "configured";
  let connection: Connection | undefined;
  let active = 0;
  const drains = new Set<() => void>();
  let maintenance: Promise<unknown> | undefined;
  let closing: Promise<void> | undefined;
  let boundedLifetime = new AbortController();
  let quarantine: { reason: unknown } | undefined;
  let freshCredentialOwner: Extract<Connection, { engine: "sqlite" }> | undefined;
  let credentialAdoption: CredentialAdoptionOwner | undefined;
  let credentialMaintenance: Promise<AuthCredentialAdoptionResult> | undefined;
  const onboardingPublicationOwner = Object.freeze({});
  const preservationOwner = Object.freeze({});
  const preservationTasks = new Set<Promise<NativeSqlitePreservationObservation>>();
  const onboardingCoreReads = new Set<Promise<OnboardingCoreReadResult>>();
  const onboardingPublicationStore: OnboardingPublicationStore = {
    records: new WeakMap(),
    disposed: new WeakMap(),
  };
  const onboardingPublicationReader = createOnboardingPublicationReader(
    onboardingPublicationStore,
    onboardingPublicationOwner,
  );
  const quarantineResource = (reason: unknown) => {
    quarantine ??= { reason };
    if (phase !== "closing" && phase !== "closed") phase = "failed";
    boundedLifetime.abort(reason);
    credentialAdoption?.lifetime.abort(reason);
  };
  const requireConnection = () => {
    if (!connection) throw new Error("Persistence is not open");
    return connection;
  };
  const requireReady = () => {
    if (quarantine) throw new Error("Persistence resource is quarantined", { cause: quarantine.reason });
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
  const assertSqliteOperation = (
    current: Extract<Connection, { engine: "sqlite" }>,
    expectedPhase: PersistencePhase,
    operation: BoundedTransactionOperation,
    ownerLifetime: AbortSignal,
    timing: TargetOperationTiming,
  ): void => {
    assertTargetOperation(operation, ownerLifetime, timing);
    if (quarantine) throw new Error("Persistence resource is quarantined", { cause: quarantine.reason });
    if (connection !== current || phase !== expectedPhase || active === 0)
      throw new Error("Target observation owner changed");
  };
  const assertCurrentSqliteTarget = (
    current: Extract<Connection, { engine: "sqlite" }>,
    expectedPhase: PersistencePhase,
    operation: BoundedTransactionOperation,
    ownerLifetime: AbortSignal,
    timing: TargetOperationTiming,
  ): void => {
    let nativeFailed = false;
    const guardFailures = new Set<unknown>();
    const failures = new Set<unknown>();
    const check = () => {
      try {
        assertSqliteOperation(current, expectedPhase, operation, ownerLifetime, timing);
        if (!current.database.$client.inTransaction) throw new Error("Target observation requires its native unit");
      } catch (error) {
        guardFailures.add(error);
        throw error;
      }
    };
    const cleanupFailed = (error: unknown) => {
      nativeFailed = true;
      failures.add(error);
      quarantineResource(error);
    };
    const reader: CopiedCatalogReader = {
      all(query, values = []) {
        check();
        const statement = current.database.$client.prepare<CopiedSqlRow, CopiedSqlValue[]>(query);
        const readFailures: unknown[] = [];
        let rows: CopiedSqlRow[] = [];
        try {
          check();
          rows = statement.all(...values);
          check();
        } catch (error) {
          if (!guardFailures.has(error)) nativeFailed = true;
          failures.add(error);
          readFailures.push(error);
        } finally {
          try {
            statement.finalize();
          } catch (error) {
            cleanupFailed(error);
            readFailures.push(error);
          }
          try {
            check();
          } catch (error) {
            failures.add(error);
            readFailures.push(error);
          }
        }
        if (readFailures.length > 0) throw readFailures[0];
        return rows;
      },
      *iterate(query, values = []) {
        check();
        const statement = current.database.$client.prepare<CopiedSqlRow, CopiedSqlValue[]>(query);
        let iterator: IterableIterator<CopiedSqlRow> | undefined;
        let readFailed = false;
        const cleanupErrors: unknown[] = [];
        const throwCleanupFailure = () => {
          if (!readFailed && cleanupErrors.length > 0) throw cleanupErrors[0];
        };
        try {
          check();
          iterator = statement.iterate(...values);
          check();
          while (true) {
            check();
            const step = iterator.next();
            check();
            if (step.done) break;
            yield step.value;
          }
        } catch (error) {
          readFailed = true;
          if (!guardFailures.has(error)) nativeFailed = true;
          failures.add(error);
          throw error;
        } finally {
          try {
            check();
          } catch (error) {
            failures.add(error);
            cleanupErrors.push(error);
          }
          try {
            iterator?.return?.();
          } catch (error) {
            cleanupFailed(error);
            cleanupErrors.push(error);
          }
          try {
            check();
          } catch (error) {
            failures.add(error);
            cleanupErrors.push(error);
          }
          try {
            statement.finalize();
          } catch (error) {
            cleanupFailed(error);
            cleanupErrors.push(error);
          }
          try {
            check();
          } catch (error) {
            failures.add(error);
            cleanupErrors.push(error);
          }
          throwCleanupFailure();
        }
      },
    };
    let assertionFailure: { reason: unknown } | undefined;
    try {
      check();
      assertSqliteMainTarget(reader, capturedMigrationsFolder);
      check();
    } catch (error) {
      assertionFailure = { reason: error };
      failures.add(error);
      if (!guardFailures.has(error) || nativeFailed) quarantineResource(error);
    }
    const errors: unknown[] = [];
    if (assertionFailure) {
      errors.push(assertionFailure.reason);
      failures.delete(assertionFailure.reason);
    }
    errors.push(...failures);
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1)
      throw new AggregateError(errors, "Target observation and cleanup failures", { cause: errors[0] });
  };
  const targetSqliteConfig = (
    current: Extract<Connection, { engine: "sqlite" }>,
    expectedPhase: PersistencePhase,
    operation: BoundedTransactionOperation,
    ownerLifetime: AbortSignal,
    timing: TargetOperationTiming,
  ) =>
    createSharedDbConfig(sqliteSchema, {
      logQuery() {
        assertSqliteOperation(current, expectedPhase, operation, ownerLifetime, timing);
      },
    });
  const assertSettledSqliteTargetUnit = (
    current: Extract<Connection, { engine: "sqlite" }>,
    expectedPhase: PersistencePhase,
    operation: BoundedTransactionOperation,
    ownerLifetime: AbortSignal,
    timing: TargetOperationTiming,
  ): void => {
    try {
      assertSqliteOperation(current, expectedPhase, operation, ownerLifetime, timing);
    } catch (error) {
      const ambiguous = new TransactionCommitAmbiguousError(error);
      quarantineResource(ambiguous);
      throw ambiguous;
    }
  };
  const observeCurrentSqliteTarget = (
    current: Extract<Connection, { engine: "sqlite" }>,
    expectedPhase: PersistencePhase,
    operation: BoundedTransactionOperation,
    ownerLifetime: AbortSignal,
    timing: TargetOperationTiming,
  ): void => {
    assertSqliteOperation(current, expectedPhase, operation, ownerLifetime, timing);
    boundedSqliteTransaction(
      current.database.$client,
      targetSqliteConfig(current, expectedPhase, operation, ownerLifetime, timing),
      operation,
      ownerLifetime,
      () => assertCurrentSqliteTarget(current, expectedPhase, operation, ownerLifetime, timing),
      quarantineResource,
    );
    assertSettledSqliteTargetUnit(current, expectedPhase, operation, ownerLifetime, timing);
  };
  const observeStandaloneSqliteTarget = (
    current: Extract<Connection, { engine: "sqlite" }>,
    expectedPhase: PersistencePhase,
  ): void => {
    const ownerLifetime = boundedLifetime.signal;
    const signal = new AbortController().signal;
    const operation = { signal, lifetime: ownerLifetime, deadlineAt: Date.now() + 30_000 };
    const timing = captureTargetOperationTiming(operation);
    observeCurrentSqliteTarget(current, expectedPhase, operation, ownerLifetime, timing);
  };
  const closeConnection = async () => {
    if (!connection) return;
    if (connection.engine === "sqlite") connection.database.$client.close(true);
    else await connection.database.$client.end();
    connection = undefined;
    freshCredentialOwner = undefined;
    credentialAdoption = undefined;
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

  function onboardingMutationAsync(
    operation: OnboardingOperation,
    invocation: OnboardingClaimInvocation,
    configuration: OnboardingSqlConfiguration,
  ): Promise<OnboardingClaimResult>;
  function onboardingMutationAsync(
    operation: OnboardingOperation,
    invocation: OnboardingNextStepInvocation,
    configuration: OnboardingSqlConfiguration,
  ): Promise<void>;
  function onboardingMutationAsync(
    operation: OnboardingOperation,
    invocation: OnboardingInitUserInvocation,
    configuration: OnboardingSqlConfiguration,
  ): Promise<void>;
  function onboardingMutationAsync(
    operation: OnboardingOperation,
    invocation: OnboardingInitialExternalGroupInvocation,
    configuration: OnboardingSqlConfiguration,
  ): Promise<void>;
  async function onboardingMutationAsync(
    operation: OnboardingOperation,
    invocation: OnboardingInvocation,
    configuration: OnboardingSqlConfiguration,
  ): Promise<OnboardingClaimResult | void> {
    const current = requireReady();
    if (config.logger !== undefined) throw new TypeError("Onboarding SQL logging must be disabled at the resource");
    const prepared = captureOnboardingMutation(operation, invocation, configuration);
    const ownerLifetime = boundedLifetime.signal;
    return executeOnboardingMutation(current, prepared, ownerLifetime);
  }

  function captureSqlitePreservationAsync(
    input: SqlitePreservationOperation,
  ): Promise<NativeSqlitePreservationObservation> {
    const current = requireReady();
    if (current.engine !== "sqlite" || config.logger !== undefined)
      throw new TypeError("SQLite preservation requires an unlogged ready SQLite resource");
    const operation = captureSqlitePreservationOperation(input);
    const ownerLifetime = boundedLifetime.signal;
    const clock = new SqlitePreservationClock(operation, ownerLifetime);
    const timing: TargetOperationTiming = {
      startedAt: operation.originalMonotonicStartedAt,
      budget: Math.min(operation.originalBudgetMs, operation.deadlineAt - operation.originalWallStartedAt),
      lastObservedAt: operation.originalMonotonicStartedAt,
    };
    const completion = Promise.withResolvers<NativeSqlitePreservationObservation>();
    preservationTasks.add(completion.promise);
    void completion.promise.catch(() => undefined);
    active += 1;
    let prepared: PreparedSqlitePreservationObservation | undefined;
    let observation: NativeSqlitePreservationObservation | undefined;
    let activityReleased = false;
    const release = () => {
      if (activityReleased) return;
      activityReleased = true;
      leave();
    };
    const rejectCapture = (primary: unknown) => {
      const errors: unknown[] = [primary];
      try {
        if (prepared) discardPreparedSqlitePreservation(prepared);
      } catch (error) {
        errors.push(error);
      }
      try {
        if (observation) disposeNativeSqlitePreservationObservation(observation);
      } catch (error) {
        errors.push(error);
      }
      try {
        release();
      } catch (error) {
        errors.push(error);
      }
      preservationTasks.delete(completion.promise);
      if (errors.length === 1) completion.reject(primary);
      else
        completion.reject(
          new AggregateError(errors, "SQLite preservation capture and cleanup failed", { cause: primary }),
        );
    };
    const underlying = Promise.resolve().then(() => {
      clock.check();
      assertSqliteOperation(current, "ready", operation, ownerLifetime, timing);
      const result = boundedSqlitePreservationObservation(
        current.database.$client,
        targetSqliteConfig(current, "ready", operation, ownerLifetime, timing),
        clock,
        () => {
          clock.check();
          assertSqliteOperation(current, "ready", operation, ownerLifetime, timing);
          const bundle = readMainTargetBundle("sqlite", capturedMigrationsFolder);
          clock.check();
          assertSqliteOperation(current, "ready", operation, ownerLifetime, timing);
          if (bundle.engine !== "sqlite" || bundle.migrationCount !== 51)
            throw new Error("SQLite preservation requires the complete target bundle");
          assertSqlitePreservationLedgerTransferBounds(
            current.database.$client,
            clock,
            () => assertSqliteOperation(current, "ready", operation, ownerLifetime, timing),
            quarantineResource,
          );
          assertCurrentSqliteTarget(current, "ready", operation, ownerLifetime, timing);
          clock.check();
          prepared = prepareSqlitePreservationRecords(
            current.database.$client,
            preservationOwner,
            clock,
            bundle.identity,
            () => assertSqliteOperation(current, "ready", operation, ownerLifetime, timing),
            quarantineResource,
          );
          assertCurrentSqliteTarget(current, "ready", operation, ownerLifetime, timing);
          clock.check();
          if (readMainTargetBundle("sqlite", capturedMigrationsFolder).identity !== bundle.identity)
            throw new Error("SQLite preservation target changed");
          assertSqliteOperation(current, "ready", operation, ownerLifetime, timing);
          return prepared;
        },
        quarantineResource,
      );
      assertSettledSqliteTargetUnit(current, "ready", operation, ownerLifetime, timing);
      clock.check();
      return result;
    });
    void underlying.then((result) => {
      try {
        clock.check();
        assertSqliteOperation(current, "ready", operation, ownerLifetime, timing);
        observation = publishSqlitePreservationObservation(result, preservationOwner);
        prepared = undefined;
        release();
        clock.check();
        preservationTasks.delete(completion.promise);
        completion.resolve(observation);
      } catch (error) {
        rejectCapture(error);
      }
    }, rejectCapture);
    return completion.promise;
  }

  function readOnboardingCoreAsync(
    input: OnboardingOperation,
    selection: OnboardingCoreReadSelection,
    authority: OnboardingCoreReadAuthority,
    configuration: OnboardingCoreReadConfiguration,
  ): Promise<OnboardingCoreReadResult> {
    const current = requireReady();
    if (current.engine !== "sqlite") throw new TypeError("CORE reads are supported only for SQLite");
    if (config.logger !== undefined) throw new TypeError("CORE SQL logging must be disabled at the resource");
    const captured = captureOnboardingCoreRead(input, selection, authority, configuration);
    const ownerLifetime = boundedLifetime.signal;
    const operation = captured.operation;
    const timing: TargetOperationTiming = {
      startedAt: operation.originalMonotonicStartedAt,
      budget: Math.min(operation.originalBudgetMs, operation.deadlineAt - operation.originalWallStartedAt),
      lastObservedAt: operation.originalMonotonicStartedAt,
    };
    const completion = Promise.withResolvers<OnboardingCoreReadResult>();
    onboardingCoreReads.add(completion.promise);
    void completion.promise.catch(() => undefined);
    active += 1;
    let publicationClock: OnboardingCoreReadClock | undefined;
    let activityReleased = false;
    const release = () => {
      if (activityReleased) return;
      activityReleased = true;
      onboardingCoreReads.delete(completion.promise);
      leave();
    };
    const underlying = Promise.resolve().then(() => {
      const clock = new OnboardingCoreReadClock(captured, ownerLifetime);
      publicationClock = clock;
      const assertCurrent = () => {
        clock.check();
        assertSqliteOperation(current, "ready", operation, ownerLifetime, timing);
      };
      const bodyState: { value: OnboardingCoreReadBody | undefined } = { value: undefined };
      let settled = false;
      type BodyOutcome =
        | { readonly kind: "pending" }
        | { readonly kind: "success"; readonly result: OnboardingCoreReadResult }
        | { readonly kind: "failed"; readonly error: unknown };
      type DisposalOutcome = { readonly kind: "clean" } | { readonly kind: "failed"; readonly error: unknown };
      const outcome: { body: BodyOutcome; disposal: DisposalOutcome } = {
        body: { kind: "pending" },
        disposal: { kind: "clean" },
      };
      try {
        assertCurrent();
        const bundle = readMainTargetBundle("sqlite", capturedMigrationsFolder);
        assertCurrent();
        if (bundle.engine !== "sqlite" || bundle.migrationCount !== 51)
          throw new Error("CORE requires the complete SQLite target bundle");
        const assertRoot = () => {
          assertCurrent();
          if (readMainTargetBundle("sqlite", capturedMigrationsFolder).identity !== bundle.identity)
            throw new Error("CORE target bundle changed");
          assertCurrent();
        };
        boundedSqliteOnboardingCoreRead(
          current.database.$client,
          targetSqliteConfig(current, "ready", operation, ownerLifetime, timing),
          clock,
          () => {
            assertCurrent();
            assertOnboardingCoreLedgerTransfer(current.database.$client, clock, assertCurrent, quarantineResource);
            assertCurrentSqliteTarget(current, "ready", operation, ownerLifetime, timing);
            bodyState.value = new OnboardingCoreReadBody(
              current.database.$client,
              captured,
              clock,
              assertCurrent,
              quarantineResource,
            );
            bodyState.value.execute();
            assertRoot();
          },
          () => {
            const body = bodyState.value;
            if (!body) throw new Error("CORE body is unavailable");
            assertCurrentSqliteTarget(current, "ready", operation, ownerLifetime, timing);
            assertRoot();
            body.commitCheck();
            assertCurrent();
          },
          quarantineResource,
        );
        settled = true;
        assertSettledSqliteTargetUnit(current, "ready", operation, ownerLifetime, timing);
        const body = bodyState.value;
        if (!body) throw new Error("CORE body did not settle");
        body.assertSettled();
        assertRoot();
        const result = body.detach();
        assertCurrent();
        outcome.body = { kind: "success", result };
      } catch (error) {
        if (settled && !(error instanceof TransactionCommitAmbiguousError)) {
          const ambiguous = new TransactionCommitAmbiguousError(error);
          quarantineResource(ambiguous);
          outcome.body = { kind: "failed", error: ambiguous };
        } else {
          outcome.body = { kind: "failed", error };
        }
      } finally {
        try {
          bodyState.value?.dispose();
        } catch (error) {
          quarantineResource(error);
          outcome.disposal = { kind: "failed", error };
        }
      }
      const bodyOutcome = outcome.body;
      const disposalOutcome = outcome.disposal;
      if (disposalOutcome.kind === "failed") {
        if (bodyOutcome.kind === "failed")
          throw new AggregateError([bodyOutcome.error, disposalOutcome.error], "CORE read and retirement failed", {
            cause: bodyOutcome.error,
          });
        throw disposalOutcome.error;
      }
      if (bodyOutcome.kind === "failed") throw bodyOutcome.error;
      if (bodyOutcome.kind === "success") return bodyOutcome.result;
      throw new Error("CORE read outcome is unavailable");
    });
    void underlying.then(
      (result) => {
        try {
          if (!publicationClock) throw new Error("CORE publication clock is unavailable");
          publicationClock.check();
          assertSqliteOperation(current, "ready", operation, ownerLifetime, timing);
          release();
          publicationClock.check();
          completion.resolve(result);
        } catch (error) {
          release();
          completion.reject(error);
        }
      },
      (error: unknown) => {
        release();
        completion.reject(error);
      },
    );
    return completion.promise;
  }

  async function executeOnboardingMutation(
    current: Connection,
    prepared: CapturedOnboardingMutation,
    ownerLifetime: AbortSignal,
    publication?: OnboardingPublicationRecord,
  ): Promise<OnboardingClaimResult | void> {
    const timing: TargetOperationTiming = {
      startedAt: prepared.operation.originalMonotonicStartedAt,
      budget: prepared.operation.originalBudgetMs,
      lastObservedAt: prepared.operation.originalMonotonicStartedAt,
    };
    active += 1;
    try {
      assertTargetOperation(prepared.operation, ownerLifetime, timing);
      if (connection !== current || phase !== "ready" || quarantine) return rejectOnboarding();
      let result: OnboardingClaimResult | void;
      if (current.engine === "sqlite") {
        result = boundedSqliteOnboardingMutation(
          current.database.$client,
          createSharedDbConfig(sqliteSchema),
          ownerLifetime,
          prepared,
          capturedMigrationsFolder,
          quarantineResource,
          publication?.observation,
        );
      } else {
        result = await boundedPostgresOnboardingMutationAsync(
          current.database.$client,
          createSharedDbConfig(postgresqlSchema),
          ownerLifetime,
          prepared,
          quarantineResource,
          publication?.observation,
        );
      }
      try {
        assertTargetOperation(prepared.operation, ownerLifetime, timing);
        if (connection !== current || phase !== "ready" || quarantine || active === 0) return rejectOnboarding();
        if (prepared.invocation.kind === "claim") {
          if (result === undefined) return rejectOnboarding();
          if (publication) {
            publication.runtimeGuard = "passed";
            publication.unit = "returned";
          }
          return result;
        }
        if (result !== undefined) return rejectOnboarding();
        if (publication) {
          publication.runtimeGuard = "passed";
          publication.unit = "returned";
        }
      } catch (error) {
        if (publication) {
          publication.runtimeGuard = "failed";
          publication.failureStage = "runtime-guard";
        }
        const ambiguous = new TransactionCommitAmbiguousError(error);
        quarantineResource(ambiguous);
        throw ambiguous;
      }
    } catch (error) {
      if (publication) {
        publication.unit = "rejected";
        if (publication.failureStage === "none") publication.failureStage = "admission";
      }
      throw error;
    } finally {
      finalizeOnboardingMutation(publication);
    }
  }

  function finalizeOnboardingMutation(publication?: OnboardingPublicationRecord): void {
    try {
      leave();
    } catch (error) {
      if (publication) {
        publication.unit = "rejected";
        publication.runtimeGuard = "failed";
        publication.failureStage = "runtime-guard";
      }
      throw error;
    } finally {
      if (publication) {
        const observation = publication.observation;
        if (observation) {
          const facts = readNativeOnboardingObservation(observation);
          if (facts) publication.nativeFacts = facts;
          disposeNativeOnboardingObservation(observation);
        }
        publication.observation = undefined;
        publication.settled = true;
      }
    }
  }

  function onboardingObservedMutation(
    operation: OnboardingOperation,
    invocation: OnboardingClaimInvocation,
    configuration: OnboardingSqlConfiguration,
  ): OnboardingObservedDispatch<OnboardingClaimResult>;
  function onboardingObservedMutation(
    operation: OnboardingOperation,
    invocation: OnboardingNextStepInvocation,
    configuration: OnboardingSqlConfiguration,
  ): OnboardingObservedDispatch<void>;
  function onboardingObservedMutation(
    operation: OnboardingOperation,
    invocation: OnboardingInitUserInvocation,
    configuration: OnboardingSqlConfiguration,
  ): OnboardingObservedDispatch<void>;
  function onboardingObservedMutation(
    operation: OnboardingOperation,
    invocation: OnboardingInitialExternalGroupInvocation,
    configuration: OnboardingSqlConfiguration,
  ): OnboardingObservedDispatch<void>;
  function onboardingObservedMutation(
    operation: OnboardingOperation,
    invocation: OnboardingInvocation,
    configuration: OnboardingSqlConfiguration,
  ): OnboardingObservedDispatch<OnboardingClaimResult | void> {
    const current = requireReady();
    if (config.logger !== undefined) throw new TypeError("Onboarding SQL logging must be disabled at the resource");
    const prepared = captureOnboardingMutation(operation, invocation, configuration);
    const ownerLifetime = boundedLifetime.signal;
    const observation = prepareNativeOnboardingObservation(prepared, ownerLifetime);
    const nativeFacts = readNativeOnboardingObservation(observation);
    if (!nativeFacts) return rejectOnboarding();
    const publication: OnboardingNativePublicationHandle = Object.freeze({ kind: "onboarding-native-publication" });
    const record: OnboardingPublicationRecord = {
      owner: onboardingPublicationOwner,
      operation: new WeakRef(operation),
      invocation: new WeakRef(invocation),
      clock: new WeakRef(configuration.now),
      maximumSnapshotRows: prepared.configuration.maximumSnapshotRows,
      observation,
      nativeFacts,
      runtimeGuard: "pending",
      unit: "pending",
      failureStage: "none",
      settled: false,
      consumed: false,
    };
    const completion = Promise.withResolvers<OnboardingClaimResult | void>();
    onboardingPublicationStore.records.set(publication, record);
    const packet: OnboardingObservedDispatch<OnboardingClaimResult | void> = Object.freeze({
      publication,
      reader: onboardingPublicationReader,
      completion: completion.promise,
    });
    const underlying = executeOnboardingMutation(current, prepared, ownerLifetime, record);
    void underlying.then(completion.resolve, completion.reject);
    return packet;
  }

  return {
    engine: config.engine,
    captureSqlitePreservationAsync,
    onboardingMutationAsync,
    onboardingObservedMutation,
    readOnboardingNativePublication: onboardingPublicationReader.readOnboardingNativePublication,
    consumeOnboardingNativePublication: onboardingPublicationReader.consumeOnboardingNativePublication,
    disposeOnboardingNativePublication: onboardingPublicationReader.disposeOnboardingNativePublication,
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
              try {
                const identity = await file.stat();
                if (!identity.isFile() || identity.size !== 0) throw new Error("Fresh SQLite ownership is unverified");
              } finally {
                await file.close();
              }
            } else if (!(await stat(config.path)).isFile())
              throw new TypeError("SQLite requires an existing regular file");
          } else if (config.mode !== "fresh") throw new TypeError("An existing database cannot be in memory");
          connection = {
            engine: "sqlite",
            database: createSqliteDb(createSharedDbConfig(sqliteSchema, config.logger), { path: config.path }),
          };
          if (config.mode === "fresh" && config.path === ":memory:") {
            if (
              connection.database.$client
                .query("SELECT name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' LIMIT 1")
                .all().length !== 0
            )
              throw new Error("Fresh SQLite native resource is not empty");
            freshCredentialOwner = connection;
          }
        } else {
          const database = createPostgresDb(createSharedDbConfig(postgresqlSchema, config.logger), config.connection);
          connection = { engine: "postgresql", database };
          await database.execute(sql`SELECT 1`);
        }
        phase = "open";
      } catch (error) {
        phase = "failed";
        try {
          await closeConnection();
        } catch (cleanupError) {
          throw new AggregateError([error, cleanupError], "Persistence open and cleanup failures", { cause: error });
        }
        throw error;
      }
    },
    async migrateSchemaAsync() {
      if (phase !== "open") throw new Error(`Persistence cannot migrate from ${phase}`);
      const current = requireConnection();
      phase = "migrating";
      try {
        const migrationsFolder = capturedMigrationsFolder;
        readMainTargetBundle(config.engine, migrationsFolder);
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
          active += 1;
          try {
            observeStandaloneSqliteTarget(current, "migrating");
          } finally {
            leave();
          }
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
        if (current.engine === "sqlite") {
          active += 1;
          try {
            observeStandaloneSqliteTarget(current, "migrating");
          } finally {
            leave();
          }
        }
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
    readOnboardingCoreAsync,
    async boardPermissionsMutationAsync(
      operation: BoundedTransactionOperation,
      mutation: BoardPermissionsMutation,
      credential: NativeCredentialEvidence,
      configuration: NativeCredentialPolicyConfiguration,
    ): Promise<void> {
      const current = requireReady();
      if (current.engine !== "sqlite") throw new TypeError("Native Board writes are supported only for SQLite");
      if (config.logger !== undefined) throw new TypeError("Credential SQL logging must be disabled at the resource");
      const captured = captureCredentialOperation(operation, credential, configuration);
      const prepared = captureBoardPermissionsMutation(mutation, captured.configuration.maximumSnapshotRows);
      const ownerLifetime = boundedLifetime.signal;
      const timing = captureTargetOperationTiming(captured.operation);
      active += 1;
      try {
        assertSqliteOperation(current, "ready", captured.operation, ownerLifetime, timing);
        boundedSqliteTransaction(
          current.database.$client,
          targetSqliteConfig(current, "ready", captured.operation, ownerLifetime, timing),
          captured.operation,
          ownerLifetime,
          (database) => {
            assertCurrentSqliteTarget(current, "ready", captured.operation, ownerLifetime, timing);
            assertSqliteOperation(current, "ready", captured.operation, ownerLifetime, timing);
            executeBoardPermissionsMutationSync(database, prepared, captured.credential, captured.configuration);
            assertSqliteOperation(current, "ready", captured.operation, ownerLifetime, timing);
          },
          quarantineResource,
        );
        assertSettledSqliteTargetUnit(current, "ready", captured.operation, ownerLifetime, timing);
      } finally {
        leave();
      }
    },
    async appMutationAsync(
      operation: BoundedTransactionOperation,
      mutation: AppMutation,
      credential: NativeCredentialEvidence,
      configuration: NativeCredentialPolicyConfiguration,
    ): Promise<AppMutationResult> {
      const current = requireReady();
      if (current.engine !== "sqlite") throw new TypeError("Native App writes are supported only for SQLite");
      if (config.logger !== undefined) throw new TypeError("Credential SQL logging must be disabled at the resource");
      const captured = captureCredentialOperation(operation, credential, configuration);
      const prepared = captureAppMutation(mutation);
      const ownerLifetime = boundedLifetime.signal;
      const timing = captureTargetOperationTiming(captured.operation);
      active += 1;
      try {
        assertSqliteOperation(current, "ready", captured.operation, ownerLifetime, timing);
        const result = boundedSqliteTransaction(
          current.database.$client,
          targetSqliteConfig(current, "ready", captured.operation, ownerLifetime, timing),
          captured.operation,
          ownerLifetime,
          (database) => {
            assertCurrentSqliteTarget(current, "ready", captured.operation, ownerLifetime, timing);
            assertSqliteOperation(current, "ready", captured.operation, ownerLifetime, timing);
            const value = executeAppMutationSync(database, prepared, captured.credential, captured.configuration);
            assertSqliteOperation(current, "ready", captured.operation, ownerLifetime, timing);
            return value;
          },
          quarantineResource,
        );
        assertSettledSqliteTargetUnit(current, "ready", captured.operation, ownerLifetime, timing);
        return result;
      } finally {
        leave();
      }
    },
    adoptAuthCredentialsAsync(
      operation: BoundedTransactionOperation,
      maximumBatchRows: number,
    ): Promise<AuthCredentialAdoptionResult> {
      if (credentialMaintenance !== undefined) throw new Error("Credential adoption is already running");
      if (quarantine) throw new Error("Persistence resource is quarantined", { cause: quarantine.reason });
      if (config.logger !== undefined) throw new TypeError("Credential SQL logging must be disabled at the resource");
      const bounded = { signal: operation.signal, lifetime: operation.lifetime, deadlineAt: operation.deadlineAt };
      if (!Number.isFinite(bounded.deadlineAt)) throw new TypeError("Transaction deadline must be finite");
      const timing = captureTargetOperationTiming(bounded);
      const maximumRows = authCredentialMaximumRows(maximumBatchRows);
      bounded.signal.throwIfAborted();
      bounded.lifetime.throwIfAborted();
      let owner = credentialAdoption;
      if (owner === undefined) {
        const current = requireReady();
        if (config.engine === "sqlite" && config.path !== ":memory:")
          throw new Error("File-backed credential adoption is held: native fresh-resource provenance is unavailable");
        if (current.engine !== "sqlite" || current !== freshCredentialOwner)
          throw new Error("Credential first-adoption provenance is unavailable");
        owner = { connection: current, lifetime: new AbortController(), domain: undefined };
        credentialAdoption = owner;
        freshCredentialOwner = undefined;
      } else if (phase !== "maintenance" || owner.connection !== requireConnection())
        throw new Error("Credential adoption authoritative scope changed");
      const retained = owner;
      retained.lifetime.signal.throwIfAborted();
      phase = "maintenance";
      const pending = Promise.resolve().then(async () => {
        await waitForIdle();
        if (quarantine) throw new Error("Persistence resource is quarantined", { cause: quarantine.reason });
        retained.lifetime.signal.throwIfAborted();
        if (phase !== "maintenance" || connection !== retained.connection || credentialAdoption !== retained)
          throw new Error("Credential adoption authoritative scope changed");
        active += 1;
        try {
          const ownerLifetime = retained.lifetime.signal;
          const runUnit = (statements: Generator<SQL, AuthCredentialAdoptionResult, readonly unknown[]>) => {
            assertSqliteOperation(retained.connection, "maintenance", bounded, ownerLifetime, timing);
            const result = boundedSqliteTransaction(
              retained.connection.database.$client,
              targetSqliteConfig(retained.connection, "maintenance", bounded, ownerLifetime, timing),
              bounded,
              ownerLifetime,
              (database) => {
                assertCurrentSqliteTarget(retained.connection, "maintenance", bounded, ownerLifetime, timing);
                const value = executeCredentialStatementsSync(database, statements, bounded, ownerLifetime, timing);
                assertSqliteOperation(retained.connection, "maintenance", bounded, ownerLifetime, timing);
                return value;
              },
              quarantineResource,
            );
            assertSettledSqliteTargetUnit(retained.connection, "maintenance", bounded, ownerLifetime, timing);
            return result;
          };
          if (retained.domain === undefined)
            retained.domain = runUnit(initializeAuthCredentialDomainStatements("sqlite"));
          while (retained.domain.phase !== "ready") {
            retained.domain = runUnit(
              authCredentialAdoptionStatements("sqlite", retained.domain.namespace, maximumRows),
            );
            if (retained.domain.phase !== "ready") await Promise.resolve();
          }
          if (phase !== "maintenance" || connection !== retained.connection || credentialAdoption !== retained)
            throw new Error("Credential adoption authoritative scope changed");
          retained.lifetime.signal.throwIfAborted();
          bounded.signal.throwIfAborted();
          bounded.lifetime.throwIfAborted();
          observeCurrentSqliteTarget(retained.connection, "maintenance", bounded, ownerLifetime, timing);
          try {
            if (credentialAdoption !== retained) throw new Error("Credential adoption authoritative scope changed");
            assertSqliteOperation(retained.connection, "maintenance", bounded, ownerLifetime, timing);
          } catch (error) {
            const ambiguous = new TransactionCommitAmbiguousError(error);
            quarantineResource(ambiguous);
            throw ambiguous;
          }
          const result = retained.domain;
          credentialAdoption = undefined;
          boundedLifetime = new AbortController();
          phase = "ready";
          return result;
        } catch (error) {
          if (error instanceof TransactionCommitAmbiguousError) quarantineResource(error);
          throw error;
        } finally {
          leave();
        }
      });
      credentialMaintenance = pending;
      maintenance = pending;
      void pending.then(
        () => {
          if (credentialMaintenance === pending) credentialMaintenance = undefined;
          if (maintenance === pending) maintenance = undefined;
        },
        () => {
          if (credentialMaintenance === pending) credentialMaintenance = undefined;
          if (maintenance === pending) maintenance = undefined;
        },
      );
      boundedLifetime.abort(new Error("Persistence entered credential adoption"));
      return pending;
    },
    async authSessionMutationAsync(
      operation: BoundedTransactionOperation,
      mutation: AuthSessionMutation,
      configuration: AuthSessionSqlConfiguration,
    ): Promise<AuthSessionSqlResult> {
      const current = requireReady();
      if (config.logger !== undefined) throw new TypeError("Auth session SQL logging must be disabled at the resource");
      const captured = prepareAuthSessionMutation(mutation, configuration, operation);
      const bounded = captured.operation;
      active += 1;
      try {
        if (current.engine === "sqlite") {
          return boundedSqliteTransaction(
            current.database.$client,
            createSharedDbConfig(sqliteSchema),
            bounded,
            boundedLifetime.signal,
            (database) => executeAuthSessionMutationSync(database, captured.prepared),
            quarantineResource,
          );
        }
        return await boundedPostgresAuthSessionMutationAsync(
          current.database.$client,
          createSharedDbConfig(postgresqlSchema),
          bounded,
          boundedLifetime.signal,
          captured.prepared,
          quarantineResource,
        );
      } finally {
        leave();
      }
    },
    async checkReadinessAsync(): Promise<{ engine: "sqlite" | "postgresql"; phase: PersistencePhase; ready: boolean }> {
      if (phase !== "ready") return { engine: config.engine, phase, ready: false };
      try {
        const current = requireReady();
        active += 1;
        try {
          if (current.engine === "sqlite") observeStandaloneSqliteTarget(current, "ready");
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
    boundedTransactionSync<T>(operation: BoundedTransactionOperation, callback: (database: HomarrDatabase) => T): T {
      const current = requireReady();
      if (current.engine !== "sqlite") throw new TypeError("Use boundedTransactionAsync for PostgreSQL");
      active += 1;
      try {
        return boundedSqliteTransaction(
          current.database.$client,
          createSharedDbConfig(sqliteSchema, config.logger),
          operation,
          boundedLifetime.signal,
          callback,
          quarantineResource,
        );
      } finally {
        leave();
      }
    },
    async boundedTransactionAsync<T>(
      operation: BoundedTransactionOperation,
      callback: (database: HomarrDatabasePostgresql) => Promise<T>,
    ): Promise<T> {
      const current = requireReady();
      if (current.engine !== "postgresql") throw new TypeError("SQLite transactions must be synchronous");
      active += 1;
      try {
        return await boundedPostgresTransactionAsync(
          current.database.$client,
          createSharedDbConfig(postgresqlSchema, config.logger),
          operation,
          boundedLifetime.signal,
          callback,
          quarantineResource,
        );
      } finally {
        leave();
      }
    },
    async boundedSnapshotAsync<T>(
      operation: BoundedTransactionOperation,
      callback: (database: HomarrDatabasePostgresql) => Promise<T>,
    ): Promise<T> {
      const current = requireReady();
      if (current.engine !== "postgresql")
        throw new TypeError("Bounded PostgreSQL snapshots are not available for SQLite");
      active += 1;
      try {
        return await boundedPostgresSnapshotAsync(
          current.database.$client,
          createSharedDbConfig(postgresqlSchema, config.logger),
          operation,
          boundedLifetime.signal,
          callback,
          quarantineResource,
        );
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
        if (quarantine) throw new Error("Persistence resource is quarantined", { cause: quarantine.reason });
        active += 1;
        try {
          return await withScopedConnectionAsync(current, operation);
        } finally {
          leave();
          if (phase === "maintenance") {
            boundedLifetime = new AbortController();
            phase = "ready";
          }
        }
      });
      maintenance = pending;
      boundedLifetime.abort(new Error("Persistence entered maintenance"));
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
      const pendingMaintenance = maintenance;
      closing = Promise.resolve().then(async () => {
        const errors: unknown[] = [];
        try {
          await pendingMaintenance;
        } catch (error) {
          errors.push(error);
        }
        await waitForIdle();
        try {
          await closeConnection();
          phase = "closed";
        } catch (error) {
          errors.push(error);
          phase = "failed";
        }
        if (errors.length === 1) throw errors[0];
        if (errors.length > 1)
          throw new AggregateError(errors, "Persistence maintenance and close failures", { cause: errors[0] });
      });
      const reason = new Error("Persistence is closing");
      boundedLifetime.abort(reason);
      credentialAdoption?.lifetime.abort(reason);
      return closing;
    },
  };
};

export type PersistenceRuntime = ReturnType<typeof createPersistenceRuntime>;
