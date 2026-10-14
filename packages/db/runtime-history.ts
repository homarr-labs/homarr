import { runtimeUninitializedEpoch } from "./runtime-catalog";
import type { BoundedTransactionOperation } from "./runtime";
import { appendTrimPostgresqlAsync, clearPostgresqlAsync } from "./runtime-history/postgresql";
import { appendTrimSqlite, clearSqlite } from "./runtime-history/sqlite";
import { createHistoryStatements } from "./runtime-history/statements";
import type {
  RuntimeHistoryLimits,
  RuntimeHistoryOperation,
  RuntimeHistoryRegistration,
  RuntimeHistorySqlOptions,
  RuntimeHistorySqlStore,
  RuntimeHistoryStream,
} from "./runtime-history/types";
import { decodeNewest, requireHistoryText, requirePositiveInteger } from "./runtime-history/validation";

export type {
  RuntimeHistoryAppendResult,
  RuntimeHistoryLimits,
  RuntimeHistoryOperation,
  RuntimeHistoryRegistration,
  RuntimeHistorySqlOptions,
  RuntimeHistorySqlStore,
  RuntimeHistoryStream,
} from "./runtime-history/types";

export const createRuntimeHistorySqlStore = (options: RuntimeHistorySqlOptions): RuntimeHistorySqlStore => {
  const { runtime, epoch, lifetime } = options;
  const limits: RuntimeHistoryLimits = { ...options.limits };
  requirePositiveInteger(limits.maxStreams, "stream limit");
  requirePositiveInteger(limits.maxIdentityBytes, "identity byte limit");
  requirePositiveInteger(limits.maxPayloadBytes, "payload byte limit");
  requirePositiveInteger(limits.maxPendingOperations, "pending operation limit");
  requirePositiveInteger(limits.maxPendingBytes, "pending byte limit");
  if (
    !Number.isFinite(limits.maxOperationDurationMs) ||
    limits.maxOperationDurationMs < 1 ||
    limits.maxOperationDurationMs > 2147483647
  ) {
    throw new RangeError("Invalid history operation duration");
  }
  const epochBytes = requireHistoryText(epoch, limits.maxIdentityBytes, "epoch");
  if (epoch.length === 0 || epoch === runtimeUninitializedEpoch)
    throw new Error("History requires an initialized epoch");
  if (options.streams.length > limits.maxStreams) throw new RangeError("History stream registration limit exceeded");
  lifetime.throwIfAborted();
  const streams = new Map<RuntimeHistoryStream["kind"], Map<string, RuntimeHistoryRegistration>>();
  for (const registration of options.streams) {
    if (registration.kind !== "log" && registration.kind !== "sample")
      throw new TypeError("Invalid history stream kind");
    requireHistoryText(registration.name, limits.maxIdentityBytes, "stream name");
    if (registration.name.length === 0) throw new TypeError("History stream name cannot be empty");
    requirePositiveInteger(registration.maxEntries, "retention");
    if (!Number.isSafeInteger(registration.maxEntries * limits.maxPayloadBytes)) {
      throw new RangeError("History read byte reservation exceeds the supported range");
    }
    let names = streams.get(registration.kind);
    if (!names) {
      names = new Map();
      streams.set(registration.kind, names);
    }
    if (names.has(registration.name)) throw new Error("Duplicate history stream registration");
    names.set(registration.name, {
      kind: registration.kind,
      name: registration.name,
      maxEntries: registration.maxEntries,
    });
  }
  let pending = 0;
  let pendingBytes = 0;

  const requireStream = (stream: RuntimeHistoryStream): RuntimeHistoryRegistration => {
    const registration = streams.get(stream.kind)?.get(stream.name);
    if (!registration) throw new Error("History stream is not registered");
    return registration;
  };

  const prepareOperation = (operation: RuntimeHistoryOperation) => {
    const startedAt = performance.now();
    const wallStartedAt = Date.now();
    if (!Number.isFinite(operation.deadlineAt)) throw new TypeError("History operation deadline must be finite");
    const budget = Math.min(operation.deadlineAt - wallStartedAt, limits.maxOperationDurationMs);
    const bounded: BoundedTransactionOperation = {
      signal: operation.signal,
      lifetime,
      deadlineAt: Math.min(operation.deadlineAt, wallStartedAt + budget),
    };
    if (!Number.isFinite(bounded.deadlineAt)) throw new RangeError("Invalid bounded history deadline");
    const check = () => {
      lifetime.throwIfAborted();
      bounded.signal.throwIfAborted();
      if (Math.min(bounded.deadlineAt - Date.now(), budget - (performance.now() - startedAt)) < 1) {
        throw new Error("History operation deadline expired");
      }
    };
    const transactionOperation = (): BoundedTransactionOperation => {
      check();
      const remaining = budget - (performance.now() - startedAt);
      return { ...bounded, deadlineAt: Math.min(bounded.deadlineAt, Date.now() + remaining) };
    };
    check();
    return { transactionOperation, check };
  };

  const admit = (stream: RuntimeHistoryStream, bytes: number): number => {
    const identityBytes =
      epochBytes + requireHistoryText(stream.name, limits.maxIdentityBytes, "stream name") + stream.kind.length;
    const reservation = bytes + identityBytes;
    if (!Number.isSafeInteger(reservation) || reservation > limits.maxPendingBytes - pendingBytes) {
      throw new Error("History pending byte budget exceeded");
    }
    if (pending >= limits.maxPendingOperations) throw new Error("History pending operation budget exceeded");
    pending += 1;
    pendingBytes += reservation;
    return reservation;
  };

  const release = (reservation: number) => {
    pending -= 1;
    pendingBytes -= reservation;
  };

  return {
    async appendTrimAsync(stream, payload, maxEntries, operation) {
      const execution = prepareOperation(operation);
      const registration = requireStream(stream);
      if (maxEntries !== registration.maxEntries)
        throw new RangeError("History append retention must match registration");
      const bytes = requireHistoryText(payload, limits.maxPayloadBytes, "payload");
      const reservation = admit(registration, bytes);
      try {
        execution.check();
        const statements = createHistoryStatements(runtime.engine, epoch, registration);
        if (runtime.engine === "sqlite") {
          return runtime.boundedTransactionSync(execution.transactionOperation(), (database) =>
            appendTrimSqlite(database, statements, epoch, payload, maxEntries, execution.check),
          );
        }
        return await runtime.boundedTransactionAsync(execution.transactionOperation(), (database) =>
          appendTrimPostgresqlAsync(database, statements, epoch, payload, maxEntries, execution.check),
        );
      } finally {
        release(reservation);
      }
    },
    async readNewestAsync(stream, maxEntries, operation) {
      const execution = prepareOperation(operation);
      const registration = requireStream(stream);
      if (!Number.isSafeInteger(maxEntries) || maxEntries < 0 || maxEntries > registration.maxEntries) {
        throw new RangeError("History read bound exceeds registration");
      }
      const reservation = admit(registration, maxEntries * limits.maxPayloadBytes);
      try {
        execution.check();
        const statement = createHistoryStatements(runtime.engine, epoch, registration).newest(
          maxEntries,
          limits.maxPayloadBytes,
        );
        if (runtime.engine === "sqlite") {
          return runtime.boundedTransactionSync(execution.transactionOperation(), (database) => {
            const rows = database.all<unknown>(statement);
            execution.check();
            const result = decodeNewest(rows, epoch, maxEntries, limits.maxPayloadBytes);
            execution.check();
            return result;
          });
        }
        return await runtime.boundedTransactionAsync(execution.transactionOperation(), async (database) => {
          const result = await database.execute(statement);
          execution.check();
          const payloads = decodeNewest(result.rows, epoch, maxEntries, limits.maxPayloadBytes);
          execution.check();
          return payloads;
        });
      } finally {
        release(reservation);
      }
    },
    async clearAsync(stream, operation) {
      const execution = prepareOperation(operation);
      const registration = requireStream(stream);
      const reservation = admit(registration, 0);
      try {
        execution.check();
        const statements = createHistoryStatements(runtime.engine, epoch, registration);
        if (runtime.engine === "sqlite") {
          runtime.boundedTransactionSync(execution.transactionOperation(), (database) =>
            clearSqlite(database, statements, epoch, execution.check),
          );
          return;
        }
        await runtime.boundedTransactionAsync(execution.transactionOperation(), (database) =>
          clearPostgresqlAsync(database, statements, epoch, execution.check),
        );
      } finally {
        release(reservation);
      }
    },
  };
};
