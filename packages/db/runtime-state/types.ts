import type { PersistenceRuntime } from "../runtime";

export interface StateOperation {
  signal: AbortSignal;
  deadlineAt: number;
}

export interface StateCondition {
  key: string;
  equals: string | null;
}

export type StateWrite =
  | { kind: "set"; key: string; value: string; ttlMs: number | null }
  | { kind: "delete"; key: string }
  | { kind: "increment"; key: string; ttlMs: number };

export interface StateMutation {
  conditions: readonly StateCondition[];
  writes: readonly StateWrite[];
  readKeys: readonly string[];
}

export interface StateSnapshot {
  now: number;
  values: Readonly<Record<string, string | null>>;
}

export type StateMutationResult = StateSnapshot & { applied: boolean };

export interface RuntimeStateSqlLimits {
  maxPendingOperations: number;
  maxOperationMs: number;
  maxReadKeys: number;
  maxConditions: number;
  maxWrites: number;
  maxDistinctKeys: number;
  maxKeyBytes: number;
  maxValueBytes: number;
  maxInputBytes: number;
  maxOutputBytes: number;
  parameterChunkSize: number;
}

export type RuntimeStateKeyRegistration = { kind: "exact"; key: string } | { kind: "prefix"; prefix: string };

export interface RuntimeStateSqlOptions {
  runtime: PersistenceRuntime;
  epoch: string;
  lifetime: AbortSignal;
  limits: RuntimeStateSqlLimits;
  registrations: readonly RuntimeStateKeyRegistration[];
}

export interface RuntimeEpochInitializationOptions {
  runtime: PersistenceRuntime;
  lifetime: AbortSignal;
  maxOperationMs: number;
}

export class RuntimeStateEpochMismatchError extends Error {
  readonly code = "RUNTIME_STATE_EPOCH_MISMATCH";

  constructor() {
    super("Runtime SQL epoch no longer matches this resource");
    this.name = "RuntimeStateEpochMismatchError";
  }
}

export class RuntimeStateFenceExpiredError extends Error {
  readonly code = "RUNTIME_STATE_FENCE_EXPIRED";

  constructor() {
    super("Runtime state condition expired or has no admitted commit fence");
    this.name = "RuntimeStateFenceExpiredError";
  }
}
