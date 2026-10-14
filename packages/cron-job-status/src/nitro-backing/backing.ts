import type { JobStatusBacking, JobStatusRecord } from "../runtime";
import type { JobStatusStateBackingOptions, StatusStateOperation, StatusStateSnapshot } from "./contracts";
import { decodeJobStatusRecord, encodeJobStatusRecord, jobStatusNotificationName, jobStatusRecordKey } from "./record";

interface StatusSubscription {
  names: ReadonlySet<string>;
  listener(record: JobStatusRecord): void;
  revisions: Map<string, number>;
  active: boolean;
  failure: Error | undefined;
}

export const createJobStatusStateBacking = (options: JobStatusStateBackingOptions) => {
  const { state, hostLifetime, operationDurationMs, maximumAttempts, maximumPendingOperations, maximumSubscriptions } =
    options;
  for (const limit of [operationDurationMs, maximumAttempts, maximumPendingOperations, maximumSubscriptions]) {
    if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error("Cron job status limits must be positive integers");
  }
  if (operationDurationMs > 500) throw new Error("Cron job status operation budget exceeds the state budget");
  const names = new Set(options.names);
  if (names.size !== options.names.length) throw new Error("Duplicate cron job status names");
  const stopping = new AbortController();
  const pending = new Set<Promise<unknown>>();
  const subscriptions = new Set<StatusSubscription>();
  let closed = false;
  let disposal: Promise<void> | undefined;

  const assertOpen = () => {
    if (closed) throw new Error("Cron job status backing is closed");
    hostLifetime.throwIfAborted();
  };

  const assertName = (name: string) => {
    if (!names.has(name)) throw new Error("Unregistered cron job status name");
  };

  const assertOperation = (operation: StatusStateOperation) => {
    operation.signal.throwIfAborted();
    if (Date.now() >= operation.deadlineAt) throw new Error("Cron job status operation timed out");
  };

  const readValue = (snapshot: StatusStateSnapshot, key: string): string | null => {
    if (!Number.isFinite(snapshot.now) || !Object.hasOwn(snapshot.values, key)) {
      throw new Error("Invalid cron job status state snapshot");
    }
    const value = snapshot.values[key];
    if (value !== null && typeof value !== "string") throw new Error("Invalid cron job status serialized value");
    return value;
  };

  const runAsync = <T>(callback: (operation: StatusStateOperation) => Promise<T>): Promise<T> => {
    assertOpen();
    if (pending.size >= maximumPendingOperations) throw new Error("Cron job status admission limit reached");
    const deadline = new AbortController();
    const operation: StatusStateOperation = {
      signal: AbortSignal.any([hostLifetime, stopping.signal, deadline.signal]),
      deadlineAt: Date.now() + operationDurationMs,
    };
    const timer = setTimeout(
      () => deadline.abort(new Error("Cron job status operation timed out")),
      operationDurationMs,
    );
    timer.unref();
    const completion = Promise.resolve().then(async () => {
      try {
        assertOperation(operation);
        return await callback(operation);
      } finally {
        clearTimeout(timer);
        pending.delete(completion);
      }
    });
    pending.add(completion);
    return completion;
  };

  const notify = (record: JobStatusRecord) => {
    const channel = jobStatusNotificationName(record.value.name);
    for (const subscription of subscriptions) {
      if (closed || hostLifetime.aborted) return;
      if (!subscription.active || !subscription.names.has(channel)) continue;
      if (record.revision <= (subscription.revisions.get(channel) ?? -1)) continue;
      subscription.revisions.set(channel, record.revision);
      try {
        subscription.listener(record);
      } catch (error) {
        subscription.active = false;
        subscription.failure ??= new Error("Committed cron job status local notification failed", { cause: error });
      }
    }
  };

  const backing: JobStatusBacking = {
    getAsync: async (name) => {
      assertName(name);
      const key = jobStatusRecordKey(name);
      return runAsync(async (operation) => {
        const snapshot = await state.readAsync([key], operation);
        assertOperation(operation);
        return decodeJobStatusRecord(name, readValue(snapshot, key));
      });
    },
    updateAsync: async (name, update) => {
      assertName(name);
      const key = jobStatusRecordKey(name);
      return runAsync(async (operation) => {
        const snapshot = await state.readAsync([key], operation);
        assertOperation(operation);
        let serialized = readValue(snapshot, key);
        for (let attempt = 0; attempt < maximumAttempts; attempt++) {
          assertOperation(operation);
          const previous = decodeJobStatusRecord(name, serialized);
          const next = update(previous);
          assertOperation(operation);
          if (next === null) return null;
          const revision = previous?.revision ?? 0;
          if (revision === Number.MAX_SAFE_INTEGER) throw new Error("Cron job status revision overflow");
          const encoded = encodeJobStatusRecord({ ...next, revision: revision + 1 });
          const record = decodeJobStatusRecord(name, encoded);
          if (record === null) throw new Error("Cron job status update produced no record");
          assertOperation(operation);
          const result = await state.mutateAsync(
            {
              conditions: [{ key, equals: serialized }],
              writes: [{ kind: "set", key, value: encoded, ttlMs: null }],
              readKeys: [key],
            },
            operation,
          );
          assertOperation(operation);
          serialized = readValue(result, key);
          if (typeof result.applied !== "boolean") throw new Error("Invalid cron job status CAS result");
          if (!result.applied) continue;
          if (serialized !== encoded) throw new Error("Cron job status CAS did not return the committed record");
          notify(record);
          return record;
        }
        throw new Error("Cron job status CAS conflict limit reached");
      });
    },
    subscribeAsync: async (requestedNames, listener) => {
      assertOpen();
      for (const name of requestedNames) assertName(name);
      if (subscriptions.size >= maximumSubscriptions) throw new Error("Cron job status subscription limit reached");
      const subscription: StatusSubscription = {
        names: new Set(requestedNames.map(jobStatusNotificationName)),
        listener,
        revisions: new Map(),
        active: true,
        failure: undefined,
      };
      subscriptions.add(subscription);
      return async () => {
        subscription.active = false;
        subscriptions.delete(subscription);
        subscription.revisions.clear();
        if (subscription.failure) throw subscription.failure;
      };
    },
  };

  const disposeAsync = (): Promise<void> => {
    if (disposal) return disposal;
    closed = true;
    stopping.abort(new Error("Cron job status backing is closed"));
    const failures: Error[] = [];
    for (const subscription of subscriptions) {
      subscription.active = false;
      subscription.revisions.clear();
      if (subscription.failure) failures.push(subscription.failure);
    }
    subscriptions.clear();
    disposal = (async () => {
      await Promise.allSettled([...pending]);
      if (failures.length > 0) throw new AggregateError(failures, "Cron job status backing delivery failed");
    })();
    return disposal;
  };

  return { backing, disposeAsync };
};
