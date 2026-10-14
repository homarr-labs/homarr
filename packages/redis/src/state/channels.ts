import { randomUUID } from "node:crypto";

import { parse, stringify } from "superjson";

import { runStateOperationAsync } from "./backing";
import type { AtomicStateBacking, StateCondition, StateWrite, StateOperation } from "./backing";

const leaseTtlMs = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("Lease TTL must be positive and finite");
  return seconds * 1000;
};

export type StateReadResult<TData> = { kind: "missing" } | { kind: "value"; value: TData };

export const createStateChannels = (backing: AtomicStateBacking, signal?: AbortSignal) => {
  const runAsync = <T>(callback: (operation: StateOperation) => Promise<T>) =>
    runStateOperationAsync(callback, 500, signal);
  const createGetSetChannel = <TData>(name: string) => {
    const getStateAsync = async (): Promise<StateReadResult<TData>> => {
      const snapshot = await runAsync((operation) => backing.readAsync([name], operation));
      const value = snapshot.values[name];
      return value === null || value === undefined
        ? { kind: "missing" }
        : { kind: "value", value: parse<TData>(value) };
    };
    return {
      getStateAsync,
      getAsync: async (): Promise<TData | null> => {
        const state = await getStateAsync();
        return state.kind === "missing" ? null : state.value;
      },
      setAsync: async (data: TData, options?: { ttlSeconds?: number; ttlMs?: number }) => {
        const ttlMs = options?.ttlMs ?? (options?.ttlSeconds === undefined ? null : options.ttlSeconds * 1000);
        if (ttlMs !== null && !Number.isFinite(ttlMs)) throw new Error("State TTL must be finite");
        const write: StateWrite =
          ttlMs !== null && ttlMs <= 0
            ? { kind: "delete", key: name }
            : { kind: "set", key: name, value: stringify(data), ttlMs };
        await runAsync((operation) =>
          backing.mutateAsync({ conditions: [], writes: [write], readKeys: [] }, operation),
        );
      },
      removeAsync: async () => {
        await runAsync((operation) =>
          backing.mutateAsync({ conditions: [], writes: [{ kind: "delete", key: name }], readKeys: [] }, operation),
        );
      },
    };
  };

  const createLockChannel = (name: string) => {
    const ownedMutationAsync = async (
      token: string,
      writes: readonly StateWrite[],
      conditions: readonly StateCondition[] = [],
    ) => {
      const result = await runAsync((operation) =>
        backing.mutateAsync(
          {
            conditions: [{ key: name, equals: token }, ...conditions],
            writes,
            readKeys: [],
          },
          operation,
        ),
      );
      return result.applied;
    };
    return {
      acquireAsync: async (ttlSeconds: number): Promise<string | null> => {
        const token = randomUUID();
        try {
          const result = await runAsync((operation) =>
            backing.mutateAsync(
              {
                conditions: [{ key: name, equals: null }],
                writes: [{ kind: "set", key: name, value: token, ttlMs: leaseTtlMs(ttlSeconds) }],
                readKeys: [],
              },
              operation,
            ),
          );
          return result.applied ? token : null;
        } catch (error) {
          void ownedMutationAsync(token, [{ kind: "delete", key: name }]).catch(() => undefined);
          throw error;
        }
      },
      renewAsync: async (token: string, ttlSeconds: number) =>
        await ownedMutationAsync(token, [{ kind: "set", key: name, value: token, ttlMs: leaseTtlMs(ttlSeconds) }]),
      releaseAsync: async (token: string) => {
        await ownedMutationAsync(token, [{ kind: "delete", key: name }]);
      },
      setIfOwnedAsync: async <TData>(
        token: string,
        targetName: string,
        data: TData,
        ttlMs: number,
        conditions: readonly StateCondition[] = [],
      ) => {
        if (!Number.isFinite(ttlMs) || ttlMs <= 0) return false;
        return await ownedMutationAsync(
          token,
          [{ kind: "set", key: targetName, value: stringify(data), ttlMs }],
          conditions,
        );
      },
      setPersistentIfOwnedAsync: async <TData>(
        token: string,
        targetName: string,
        data: TData,
        conditions: readonly StateCondition[] = [],
      ) =>
        await ownedMutationAsync(
          token,
          [{ kind: "set", key: targetName, value: stringify(data), ttlMs: null }],
          conditions,
        ),
      setManyIfOwnedAsync: async (
        token: string,
        writes: readonly StateWrite[],
        conditions: readonly StateCondition[] = [],
      ) => await ownedMutationAsync(token, writes, conditions),
    };
  };

  return { createGetSetChannel, createLockChannel };
};

export type StateSnapshotChannels = ReturnType<typeof createStateChannels>;

export interface StateChannels {
  createGetSetChannel<TData>(name: string): {
    getAsync(): Promise<TData | null>;
    setAsync(data: TData, options?: { ttlSeconds?: number; ttlMs?: number }): Promise<void>;
    removeAsync(): Promise<void>;
  };
  createLockChannel: StateSnapshotChannels["createLockChannel"];
}
