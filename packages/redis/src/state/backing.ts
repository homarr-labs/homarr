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

export interface AtomicStateBacking {
  readAsync(keys: readonly string[], operation: StateOperation): Promise<StateSnapshot>;
  mutateAsync(mutation: StateMutation, operation: StateOperation): Promise<StateMutationResult>;
}

export interface StateDiagnostics {
  warn(message: string, metadata: Record<string, unknown>, error?: unknown): void;
}

export const runStateOperationAsync = async <T>(
  callback: (operation: StateOperation) => Promise<T>,
  durationMs = 500,
  lifetime?: AbortSignal,
): Promise<T> => {
  lifetime?.throwIfAborted();
  const controller = new AbortController();
  const signal = lifetime ? AbortSignal.any([controller.signal, lifetime]) : controller.signal;
  const deadlineAt = Date.now() + durationMs;
  return await new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => {
      const error = new Error("State operation timed out");
      controller.abort(error);
      reject(error);
    }, durationMs);
    timer.unref?.();
    Promise.resolve()
      .then(() => {
        signal.throwIfAborted();
        return callback({ signal, deadlineAt });
      })
      .then(resolve, reject)
      .finally(() => {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
      });
  });
};

export const combineStateGenerations = (global: string | null | undefined, scoped: string | null | undefined) => {
  const value = scoped ?? "0";
  return !global || global === "0" ? value : `${global}:${value}`;
};
