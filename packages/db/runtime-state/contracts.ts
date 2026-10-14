import type { PersistenceRuntime } from "../runtime";

export interface RuntimeStateOperation {
  signal: AbortSignal;
  deadlineAt: number;
}

export interface RuntimeStateCondition {
  key: string;
  equals: string | null;
}

export type RuntimeStateWrite =
  | { kind: "set"; key: string; value: string; ttlMs: number | null }
  | { kind: "delete"; key: string }
  | { kind: "increment"; key: string; ttlMs: number };

export interface RuntimeStateMutation {
  conditions: readonly RuntimeStateCondition[];
  writes: readonly RuntimeStateWrite[];
  readKeys: readonly string[];
}

export interface RuntimeStateSnapshot {
  now: number;
  values: Readonly<Record<string, string | null>>;
}

export type RuntimeStateMutationResult = RuntimeStateSnapshot & { applied: boolean };

export interface RuntimeStateSqlBacking {
  readAsync(keys: readonly string[], operation: RuntimeStateOperation): Promise<RuntimeStateSnapshot>;
  mutateAsync(mutation: RuntimeStateMutation, operation: RuntimeStateOperation): Promise<RuntimeStateMutationResult>;
}

export type RuntimeStateRegistration = { kind: "key"; key: string } | { kind: "prefix"; prefix: string };

export interface RuntimeStateLimits {
  maxPendingOperations: number;
  maxOperationMs: number;
  maxKeys: number;
  maxConditions: number;
  maxWrites: number;
  maxKeyBytes: number;
  maxValueBytes: number;
  maxInputBytes: number;
  maxObservationBytes: number;
  maxSnapshotBytes: number;
}

export interface RuntimeStateSqlOptions {
  runtime: PersistenceRuntime;
  epoch: string;
  lifetime: AbortSignal;
  registrations: readonly RuntimeStateRegistration[];
  limits: RuntimeStateLimits;
}

export interface RuntimeStateEpochOptions {
  runtime: PersistenceRuntime;
  lifetime: AbortSignal;
  maxOperationMs: number;
}

export interface RuntimeStateRow {
  key: string;
  value: string;
  expiresAtMs: number | null;
}

export type PreparedStateWrite = { kind: "delete"; key: string } | ({ kind: "set" } & RuntimeStateRow);
