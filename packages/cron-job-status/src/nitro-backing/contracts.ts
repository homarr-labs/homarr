export interface StatusStateOperation {
  signal: AbortSignal;
  deadlineAt: number;
}

export interface StatusStateSnapshot {
  now: number;
  values: Readonly<Record<string, string | null>>;
}

export interface StatusStateMutation {
  conditions: readonly { key: string; equals: string | null }[];
  writes: readonly (
    | { kind: "set"; key: string; value: string; ttlMs: number | null }
    | { kind: "delete"; key: string }
    | { kind: "increment"; key: string; ttlMs: number }
  )[];
  readKeys: readonly string[];
}

export interface StatusStateBacking {
  readAsync(keys: readonly string[], operation: StatusStateOperation): Promise<StatusStateSnapshot>;
  mutateAsync(
    mutation: StatusStateMutation,
    operation: StatusStateOperation,
  ): Promise<StatusStateSnapshot & { applied: boolean }>;
}

export interface JobStatusStateBackingOptions {
  state: StatusStateBacking;
  hostLifetime: AbortSignal;
  names: readonly string[];
  operationDurationMs: number;
  maximumAttempts: number;
  maximumPendingOperations: number;
  maximumSubscriptions: number;
}
