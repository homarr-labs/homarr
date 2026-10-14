import { Buffer } from "node:buffer";

import type { BoundedTransactionOperation } from "../runtime";
import { runtimeUninitializedEpoch } from "../runtime-catalog";
import type {
  PreparedStateWrite,
  RuntimeStateLimits,
  RuntimeStateMutation,
  RuntimeStateOperation,
  RuntimeStateRegistration,
  RuntimeStateRow,
  RuntimeStateSnapshot,
} from "./contracts";

const minimumCounter = -9223372036854775808n;
const maximumCounter = 9223372036854775807n;

export const textBytes = (value: string): number => {
  if (typeof value !== "string" || value.includes("\0")) throw new TypeError("State SQL requires valid text");
  for (const character of value) {
    const point = character.codePointAt(0);
    if (point !== undefined && point >= 0xd800 && point <= 0xdfff)
      throw new TypeError("State SQL requires well-formed Unicode");
  }
  return Buffer.byteLength(value, "utf8");
};

export const assertEpoch = (epoch: unknown): string => {
  if (
    typeof epoch !== "string" ||
    epoch === runtimeUninitializedEpoch ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(epoch)
  )
    throw new Error("Runtime state epoch is not initialized");
  return epoch;
};

const positiveInteger = (value: number, name: string, maximum = Number.MAX_SAFE_INTEGER) => {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new TypeError(`Invalid state limit: ${name}`);
};

export const assertDuration = (duration: number) => {
  if (!Number.isFinite(duration) || duration < 1 || duration > 2147483647)
    throw new TypeError("Invalid state operation duration");
};

export const captureLimits = (limits: RuntimeStateLimits): Readonly<RuntimeStateLimits> => {
  const captured = { ...limits };
  positiveInteger(captured.maxPendingOperations, "maxPendingOperations");
  assertDuration(captured.maxOperationMs);
  positiveInteger(captured.maxKeys, "maxKeys", 256);
  positiveInteger(captured.maxConditions, "maxConditions", 512);
  positiveInteger(captured.maxWrites, "maxWrites", 512);
  positiveInteger(captured.maxKeyBytes, "maxKeyBytes");
  positiveInteger(captured.maxValueBytes, "maxValueBytes");
  positiveInteger(captured.maxInputBytes, "maxInputBytes");
  positiveInteger(captured.maxObservationBytes, "maxObservationBytes");
  positiveInteger(captured.maxSnapshotBytes, "maxSnapshotBytes");
  return Object.freeze(captured);
};

export const createKeyAdmission = (
  registrations: readonly RuntimeStateRegistration[],
  limits: Readonly<RuntimeStateLimits>,
) => {
  if (registrations.length < 1 || registrations.length > 512)
    throw new TypeError("State registrations must be explicitly bounded");
  const exactKeys = new Set<string>();
  const prefixes: string[] = [];
  for (const registration of registrations) {
    const key = registration.kind === "key" ? registration.key : registration.prefix;
    if (
      typeof key !== "string" ||
      key.length === 0 ||
      key.length > limits.maxKeyBytes ||
      textBytes(key) > limits.maxKeyBytes
    )
      throw new TypeError("Invalid state registration");
    if (registration.kind === "key") exactKeys.add(key);
    else if (registration.kind === "prefix") prefixes.push(key);
    else throw new TypeError("Unknown state registration");
  }
  return (key: string): number => {
    if (typeof key !== "string" || key.length === 0 || key.length > limits.maxKeyBytes)
      throw new TypeError("State key exceeds admission limits");
    const bytes = textBytes(key);
    if (bytes > limits.maxKeyBytes) throw new TypeError("State key exceeds admission limits");
    if (!exactKeys.has(key) && !prefixes.some((prefix) => key.startsWith(prefix)))
      throw new Error("State key is not registered");
    return bytes;
  };
};

export const createOperation = (incoming: RuntimeStateOperation, lifetime: AbortSignal, maxOperationMs: number) => {
  if (!Number.isFinite(incoming.deadlineAt)) throw new TypeError("State operation deadline must be finite");
  const startedAt = performance.now();
  const hostStartedAt = Date.now();
  const budget = Math.min(incoming.deadlineAt - hostStartedAt, maxOperationMs);
  const operation: BoundedTransactionOperation = {
    signal: incoming.signal,
    lifetime,
    deadlineAt: hostStartedAt + budget,
  };
  const check = () => {
    operation.lifetime.throwIfAborted();
    operation.signal.throwIfAborted();
    if (operation.deadlineAt - Date.now() < 1 || budget - (performance.now() - startedAt) < 1)
      throw new Error("State operation deadline expired");
  };
  check();
  return { operation, check };
};

export const captureKeys = (
  incoming: readonly string[],
  admitKey: (key: string) => number,
  limits: Readonly<RuntimeStateLimits>,
): readonly string[] => {
  if (incoming.length > limits.maxKeys) throw new TypeError("State read key limit exceeded");
  let bytes = 0;
  const keys = [...new Set(incoming)];
  for (const key of keys) bytes += admitKey(key);
  if (bytes > limits.maxInputBytes) throw new TypeError("State input byte limit exceeded");
  return keys;
};

const assertTtl = (ttlMs: number, positive: boolean) => {
  if (!Number.isFinite(ttlMs) || (positive && ttlMs <= 0)) throw new TypeError("Invalid state TTL");
};

export const captureMutation = (
  incoming: RuntimeStateMutation,
  admitKey: (key: string) => number,
  limits: Readonly<RuntimeStateLimits>,
): { mutation: RuntimeStateMutation; keys: readonly string[] } => {
  if (incoming.conditions.length > limits.maxConditions || incoming.writes.length > limits.maxWrites)
    throw new TypeError("State mutation size limit exceeded");
  if (incoming.readKeys.length > limits.maxKeys) throw new TypeError("State read key limit exceeded");
  let bytes = 0;
  const keys = new Set<string>();
  const key = (value: string) => {
    bytes += admitKey(value);
    if (bytes > limits.maxInputBytes) throw new TypeError("State input byte limit exceeded");
    keys.add(value);
    if (keys.size > limits.maxKeys) throw new TypeError("State mutation key limit exceeded");
    return value;
  };
  const value = (text: string) => {
    if (typeof text !== "string" || text.length > limits.maxValueBytes)
      throw new TypeError("State value byte limit exceeded");
    const size = textBytes(text);
    if (size > limits.maxValueBytes) throw new TypeError("State value byte limit exceeded");
    bytes += size;
    if (bytes > limits.maxInputBytes) throw new TypeError("State input byte limit exceeded");
    return text;
  };
  const conditions = incoming.conditions.map((condition) => ({
    key: key(condition.key),
    equals: condition.equals === null ? null : value(condition.equals),
  }));
  const writes = incoming.writes.map((write) => {
    const writeKey = key(write.key);
    switch (write.kind) {
      case "delete":
        return { kind: "delete" as const, key: writeKey };
      case "set":
        if (write.ttlMs !== null) assertTtl(write.ttlMs, false);
        return { kind: "set" as const, key: writeKey, value: value(write.value), ttlMs: write.ttlMs };
      case "increment":
        assertTtl(write.ttlMs, true);
        return { kind: "increment" as const, key: writeKey, ttlMs: write.ttlMs };
      default:
        throw new TypeError("Unknown state write");
    }
  });
  const readKeys = [...new Set(incoming.readKeys.map(key))];
  if (bytes > limits.maxInputBytes) throw new TypeError("State input byte limit exceeded");
  return { mutation: { conditions, writes, readKeys }, keys: [...keys] };
};

export const clockValue = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new Error("Invalid runtime SQL clock");
  return value;
};

export const expiryValue = (value: unknown): number | null => {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER)
    throw new Error("Invalid runtime state expiry");
  return value;
};

export const rowRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Invalid runtime state SQL row");
  return value as Record<string, unknown>;
};

export const effectiveValue = (row: RuntimeStateRow | undefined, now: number): string | null =>
  row && (row.expiresAtMs === null || row.expiresAtMs > now) ? row.value : null;

export const snapshot = (
  keys: readonly string[],
  rows: ReadonlyMap<string, RuntimeStateRow>,
  now: number,
  limits: Readonly<RuntimeStateLimits>,
): RuntimeStateSnapshot => {
  let bytes = 0;
  const entries = keys.map((key) => {
    const value = effectiveValue(rows.get(key), now);
    bytes += textBytes(key) + (value === null ? 0 : textBytes(value));
    return [key, value] as const;
  });
  if (bytes > limits.maxSnapshotBytes) throw new Error("State snapshot byte limit exceeded");
  return Object.freeze({ now, values: Object.freeze(Object.fromEntries(entries)) });
};

const expiryFromTtl = (now: number, ttlMs: number | null): number | null => {
  if (ttlMs === null) return null;
  const expiry = now + ttlMs;
  if (!Number.isFinite(expiry) || expiry > Number.MAX_SAFE_INTEGER || expiry <= now)
    throw new TypeError("State TTL arithmetic is not representable");
  return expiry;
};

const increment = (previous: string | null): string => {
  if (previous !== null && (!/^(?:0|-?[1-9][0-9]*)$/.test(previous) || previous.length > 20))
    throw new TypeError("State counter is not a canonical Redis integer");
  const current = previous === null ? 0n : BigInt(previous);
  if (current < minimumCounter || current >= maximumCounter) throw new RangeError("State counter overflow");
  return (current + 1n).toString();
};

export const prepareWrites = (
  mutation: RuntimeStateMutation,
  original: ReadonlyMap<string, RuntimeStateRow>,
  now: number,
  limits: Readonly<RuntimeStateLimits>,
): { writes: readonly PreparedStateWrite[]; rows: ReadonlyMap<string, RuntimeStateRow> } => {
  const rows = new Map(original);
  const writes: PreparedStateWrite[] = [];
  for (const write of mutation.writes) {
    if (write.kind === "delete" || (write.kind === "set" && write.ttlMs !== null && write.ttlMs <= 0)) {
      rows.delete(write.key);
      writes.push({ kind: "delete", key: write.key });
    } else {
      const value = write.kind === "increment" ? increment(effectiveValue(rows.get(write.key), now)) : write.value;
      if (textBytes(value) > limits.maxValueBytes) throw new TypeError("State value byte limit exceeded");
      const row: RuntimeStateRow = { key: write.key, value, expiresAtMs: expiryFromTtl(now, write.ttlMs) };
      rows.set(row.key, row);
      writes.push({ kind: "set", ...row });
    }
  }
  return { writes, rows };
};

export const conditionExpiry = (
  mutation: RuntimeStateMutation,
  rows: ReadonlyMap<string, RuntimeStateRow>,
): number | null => {
  let earliest: number | null = null;
  for (const condition of mutation.conditions) {
    if (condition.equals === null) continue;
    const expiry = rows.get(condition.key)?.expiresAtMs;
    if (expiry !== null && expiry !== undefined) earliest = earliest === null ? expiry : Math.min(earliest, expiry);
  }
  return earliest;
};
