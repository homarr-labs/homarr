import { randomUUID } from "node:crypto";

import type { HomarrDatabase, HomarrDatabasePostgresql } from "./driver";
import { runtimeUninitializedEpoch } from "./runtime-catalog";
import type {
  RuntimeStateEpochOptions,
  RuntimeStateLimits,
  RuntimeStateMutation,
  RuntimeStateMutationResult,
  RuntimeStateOperation,
  RuntimeStateRow,
  RuntimeStateSnapshot,
  RuntimeStateSqlBacking,
  RuntimeStateSqlOptions,
} from "./runtime-state/contracts";
import {
  initializeEpochStatement,
  stateClockStatement,
  stateEpochStatement,
  stateMutexStatement,
  stateRowsStatement,
  stateSnapshotStatement,
  stateWriteStatement,
} from "./runtime-state/statements";
import {
  assertDuration,
  assertEpoch,
  captureKeys,
  captureLimits,
  captureMutation,
  clockValue,
  conditionExpiry,
  createKeyAdmission,
  createOperation,
  effectiveValue,
  expiryValue,
  prepareWrites,
  rowRecord,
  snapshot,
  textBytes,
} from "./runtime-state/validation";

export type {
  RuntimeStateCondition,
  RuntimeStateEpochOptions,
  RuntimeStateLimits,
  RuntimeStateMutation,
  RuntimeStateMutationResult,
  RuntimeStateOperation,
  RuntimeStateRegistration,
  RuntimeStateSnapshot,
  RuntimeStateSqlBacking,
  RuntimeStateSqlOptions,
  RuntimeStateWrite,
} from "./runtime-state/contracts";

const singleRow = (rows: readonly unknown[]): Record<string, unknown> => {
  if (rows.length !== 1) throw new Error("Runtime state metadata is unavailable");
  return rowRecord(rows[0]);
};

const checkEpoch = (rows: readonly unknown[], epoch: string) => {
  if (singleRow(rows).epoch !== epoch) throw new Error("Runtime state epoch changed");
};

const checkMutex = (rows: readonly unknown[]) => {
  if (singleRow(rows).epoch !== null) throw new Error("Runtime state mutex is unavailable");
};

const decodeRows = (
  result: readonly unknown[],
  requested: ReadonlySet<string>,
  rows: Map<string, RuntimeStateRow>,
  limits: Readonly<RuntimeStateLimits>,
) => {
  if (result.length > requested.size) throw new Error("Unexpected runtime state row count");
  let bytes = 0;
  for (const row of rows.values()) bytes += textBytes(row.key) + textBytes(row.value);
  for (const raw of result) {
    const row = rowRecord(raw);
    if (typeof row.key !== "string" || !requested.has(row.key) || rows.has(row.key))
      throw new Error("Unexpected runtime state key");
    if (typeof row.value !== "string" || textBytes(row.value) > limits.maxValueBytes)
      throw new Error("Invalid runtime state value");
    bytes += textBytes(row.key) + textBytes(row.value);
    if (bytes > limits.maxObservationBytes) throw new Error("State observation byte limit exceeded");
    rows.set(row.key, { key: row.key, value: row.value, expiresAtMs: expiryValue(row.expires_at_ms) });
  }
};

const decodeSnapshot = (
  result: readonly unknown[],
  keys: readonly string[],
  epoch: string,
  limits: Readonly<RuntimeStateLimits>,
): RuntimeStateSnapshot => {
  if (result.length !== Math.max(1, keys.length)) throw new Error("Invalid runtime state snapshot row count");
  const now = clockValue(rowRecord(result[0]).now);
  const requested = new Set(keys);
  const observed = new Set<string>();
  const rows = new Map<string, RuntimeStateRow>();
  let bytes = 0;
  for (const raw of result) {
    const row = rowRecord(raw);
    if (row.epoch !== epoch) throw new Error("Runtime state epoch changed");
    if (clockValue(row.now) !== now) throw new Error("Runtime state snapshot clock changed");
    if (row.oversized !== 0) throw new Error("State value byte limit exceeded");
    if (keys.length === 0) {
      if (row.key !== null || row.value !== null || row.expires_at_ms !== null)
        throw new Error("Invalid empty runtime state snapshot");
      continue;
    }
    if (typeof row.key !== "string" || !requested.has(row.key) || observed.has(row.key))
      throw new Error("Unexpected runtime state snapshot key");
    observed.add(row.key);
    const expiresAtMs = expiryValue(row.expires_at_ms);
    if (row.value === null) continue;
    if (typeof row.value !== "string" || textBytes(row.value) > limits.maxValueBytes)
      throw new Error("Invalid runtime state snapshot value");
    bytes += textBytes(row.key) + textBytes(row.value);
    if (bytes > limits.maxObservationBytes) throw new Error("State observation byte limit exceeded");
    rows.set(row.key, { key: row.key, value: row.value, expiresAtMs });
  }
  return snapshot(keys, rows, now, limits);
};

const checkAffectedRows = (value: unknown, kind: "set" | "delete") => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 1)
    throw new Error("Invalid runtime state mutation effect");
  if (kind === "set" && value !== 1) throw new Error("Runtime state write did not affect its row");
};

const prepareMutation = (
  mutation: RuntimeStateMutation,
  rows: ReadonlyMap<string, RuntimeStateRow>,
  now: number,
  limits: Readonly<RuntimeStateLimits>,
) => {
  const applied = mutation.conditions.every(
    (condition) => effectiveValue(rows.get(condition.key), now) === condition.equals,
  );
  if (!applied)
    return {
      kind: "failed" as const,
      result: Object.freeze({ applied: false, ...snapshot(mutation.readKeys, rows, now, limits) }),
    };
  const prepared = prepareWrites(mutation, rows, now, limits);
  return {
    kind: "prepared" as const,
    writes: prepared.writes,
    expiry: conditionExpiry(mutation, rows),
    result: { applied: true, ...snapshot(mutation.readKeys, prepared.rows, now, limits) },
  };
};

const physicalMutationSnapshot = (
  mutation: RuntimeStateMutation,
  rows: ReadonlyMap<string, RuntimeStateRow>,
  expected: RuntimeStateSnapshot,
  limits: Readonly<RuntimeStateLimits>,
): RuntimeStateMutationResult => {
  const result = snapshot(mutation.readKeys, rows, expected.now, limits);
  for (const key of mutation.readKeys) {
    if (result.values[key] !== expected.values[key]) throw new Error("Runtime state physical write result changed");
  }
  return Object.freeze({ applied: true, ...result });
};

const checkConditionExpiry = (expiry: number | null, now: number) => {
  if (expiry !== null && expiry <= now) throw new Error("Runtime state condition expired before COMMIT");
};

const mutateSqlite = (
  database: HomarrDatabase,
  epoch: string,
  mutation: RuntimeStateMutation,
  keys: readonly string[],
  limits: Readonly<RuntimeStateLimits>,
  check: () => void,
): RuntimeStateMutationResult => {
  checkEpoch(database.all(stateEpochStatement("sqlite")), epoch);
  checkMutex(database.all(stateMutexStatement("sqlite")));
  check();
  const now = clockValue(singleRow(database.all(stateClockStatement("sqlite"))).now);
  const rows = new Map<string, RuntimeStateRow>();
  for (let offset = 0; offset < keys.length; offset += 128) {
    check();
    const chunk = keys.slice(offset, offset + 128);
    decodeRows(
      database.all(stateRowsStatement("sqlite", epoch, chunk, limits.maxValueBytes, now)),
      new Set(chunk),
      rows,
      limits,
    );
  }
  check();
  const prepared = prepareMutation(mutation, rows, now, limits);
  if (prepared.kind === "failed") return prepared.result;
  for (const write of prepared.writes) {
    check();
    checkAffectedRows(database.run(stateWriteStatement("sqlite", epoch, write)).changes, write.kind);
  }
  const finalRows = new Map<string, RuntimeStateRow>();
  for (let offset = 0; offset < mutation.readKeys.length; offset += 128) {
    check();
    const chunk = mutation.readKeys.slice(offset, offset + 128);
    decodeRows(
      database.all(stateRowsStatement("sqlite", epoch, chunk, limits.maxValueBytes, now)),
      new Set(chunk),
      finalRows,
      limits,
    );
  }
  const result = physicalMutationSnapshot(mutation, finalRows, prepared.result, limits);
  check();
  if (prepared.expiry !== null)
    checkConditionExpiry(prepared.expiry, clockValue(singleRow(database.all(stateClockStatement("sqlite"))).now));
  check();
  return result;
};

const mutatePostgresqlAsync = async (
  database: HomarrDatabasePostgresql,
  epoch: string,
  mutation: RuntimeStateMutation,
  keys: readonly string[],
  limits: Readonly<RuntimeStateLimits>,
  check: () => void,
): Promise<RuntimeStateMutationResult> => {
  checkEpoch((await database.execute(stateEpochStatement("postgresql"))).rows, epoch);
  check();
  checkMutex((await database.execute(stateMutexStatement("postgresql"))).rows);
  check();
  const now = clockValue(singleRow((await database.execute(stateClockStatement("postgresql"))).rows).now);
  const rows = new Map<string, RuntimeStateRow>();
  for (let offset = 0; offset < keys.length; offset += 128) {
    check();
    const chunk = keys.slice(offset, offset + 128);
    decodeRows(
      (await database.execute(stateRowsStatement("postgresql", epoch, chunk, limits.maxValueBytes, now))).rows,
      new Set(chunk),
      rows,
      limits,
    );
  }
  check();
  const prepared = prepareMutation(mutation, rows, now, limits);
  if (prepared.kind === "failed") return prepared.result;
  if (prepared.expiry !== null)
    throw new Error("PostgreSQL state mutations cannot rely on expiring positive conditions");
  for (const write of prepared.writes) {
    check();
    checkAffectedRows((await database.execute(stateWriteStatement("postgresql", epoch, write))).rowCount, write.kind);
  }
  const finalRows = new Map<string, RuntimeStateRow>();
  for (let offset = 0; offset < mutation.readKeys.length; offset += 128) {
    check();
    const chunk = mutation.readKeys.slice(offset, offset + 128);
    decodeRows(
      (await database.execute(stateRowsStatement("postgresql", epoch, chunk, limits.maxValueBytes, now))).rows,
      new Set(chunk),
      finalRows,
      limits,
    );
  }
  const result = physicalMutationSnapshot(mutation, finalRows, prepared.result, limits);
  check();
  return result;
};

export const initializeRuntimeStateEpochAsync = async (
  options: RuntimeStateEpochOptions,
  incoming: RuntimeStateOperation,
): Promise<string> => {
  const { runtime, lifetime, maxOperationMs } = options;
  assertDuration(maxOperationMs);
  const { operation, check } = createOperation(incoming, lifetime, maxOperationMs);
  if (runtime.engine === "sqlite") {
    return runtime.boundedTransactionSync(operation, (database) => {
      const installed = singleRow(database.all(stateEpochStatement("sqlite", true))).epoch;
      checkMutex(database.all(stateMutexStatement("sqlite")));
      check();
      if (installed !== runtimeUninitializedEpoch) return assertEpoch(installed);
      const epoch = randomUUID();
      checkEpoch(database.all(initializeEpochStatement("sqlite", runtimeUninitializedEpoch, epoch)), epoch);
      check();
      return epoch;
    });
  }
  return await runtime.boundedTransactionAsync(operation, async (database) => {
    const installed = singleRow((await database.execute(stateEpochStatement("postgresql", true))).rows).epoch;
    check();
    checkMutex((await database.execute(stateMutexStatement("postgresql"))).rows);
    check();
    if (installed !== runtimeUninitializedEpoch) return assertEpoch(installed);
    const epoch = randomUUID();
    checkEpoch(
      (await database.execute(initializeEpochStatement("postgresql", runtimeUninitializedEpoch, epoch))).rows,
      epoch,
    );
    check();
    return epoch;
  });
};

export const createRuntimeStateSqlBacking = (options: RuntimeStateSqlOptions): RuntimeStateSqlBacking => {
  const { runtime, lifetime } = options;
  const epoch = assertEpoch(options.epoch);
  const limits = captureLimits(options.limits);
  const admitKey = createKeyAdmission(options.registrations, limits);
  lifetime.throwIfAborted();
  let active = 0;
  const enter = (incoming: RuntimeStateOperation) => {
    const admitted = createOperation(incoming, lifetime, limits.maxOperationMs);
    if (active >= limits.maxPendingOperations) throw new Error("Runtime state SQL admission limit exceeded");
    active += 1;
    return admitted;
  };
  return Object.freeze({
    async readAsync(incomingKeys: readonly string[], incoming: RuntimeStateOperation): Promise<RuntimeStateSnapshot> {
      const { operation, check } = enter(incoming);
      try {
        const keys = captureKeys(incomingKeys, admitKey, limits);
        check();
        const statement = stateSnapshotStatement(runtime.engine, epoch, keys, limits.maxValueBytes);
        if (runtime.engine === "sqlite") {
          return runtime.boundedTransactionSync(operation, (database) => {
            const result = decodeSnapshot(database.all(statement), keys, epoch, limits);
            check();
            return result;
          });
        }
        return await runtime.boundedTransactionAsync(operation, async (database) => {
          const result = decodeSnapshot((await database.execute(statement)).rows, keys, epoch, limits);
          check();
          return result;
        });
      } finally {
        active -= 1;
      }
    },
    async mutateAsync(
      incomingMutation: RuntimeStateMutation,
      incoming: RuntimeStateOperation,
    ): Promise<RuntimeStateMutationResult> {
      const { operation, check } = enter(incoming);
      try {
        const { mutation, keys } = captureMutation(incomingMutation, admitKey, limits);
        check();
        if (runtime.engine === "sqlite")
          return runtime.boundedTransactionSync(operation, (database) =>
            mutateSqlite(database, epoch, mutation, keys, limits, check),
          );
        return await runtime.boundedTransactionAsync(operation, (database) =>
          mutatePostgresqlAsync(database, epoch, mutation, keys, limits, check),
        );
      } finally {
        active -= 1;
      }
    },
  });
};
