import { randomUUID } from "node:crypto";

import { combineStateGenerations, runStateOperationAsync } from "./backing";
import type { AtomicStateBacking, StateCondition, StateDiagnostics, StateWrite, StateOperation } from "./backing";

export interface StateGeneration {
  value: string;
  isShared: boolean;
  fence: readonly StateCondition[];
}

interface PendingInvalidation {
  generation: string;
  clearSession: boolean;
}

interface GenerationRead {
  generation: StateGeneration;
  expiresAt: number;
}

const MAX_PENDING = 1000;
const MAX_READS = 1000;
const GENERATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SUCCESS_TTL_MS = 1000;
const UNAVAILABLE_TTL_MS = 5000;

const unavailable = (value: string): StateGeneration => ({ value, isShared: false, fence: [] });

export const getStateIntegrationSessionKey = (integrationId: string) => `session-store:${integrationId}`;

export const createStateGenerations = (backing: AtomicStateBacking, diagnostics: StateDiagnostics) => {
  const lifetime = new AbortController();
  const runAsync = <T>(callback: (operation: StateOperation) => Promise<T>) =>
    runStateOperationAsync(callback, 500, lifetime.signal);
  const reads = new Map<string, GenerationRead>();
  const inflight = new Map<string, { token: object; promise: Promise<StateGeneration> }>();
  let stopped = false;

  const remember = (key: string, generation: StateGeneration) => {
    reads.delete(key);
    while (reads.size >= MAX_READS) {
      const oldest = reads.keys().next().value;
      if (oldest === undefined) break;
      reads.delete(oldest);
    }
    reads.set(key, { generation, expiresAt: Date.now() + (generation.isShared ? SUCCESS_TTL_MS : UNAVAILABLE_TTL_MS) });
  };

  const createScope = (kind: "integration" | "widget") => {
    const globalKey = `${kind}-cache:global-generation:v1`;
    const scopedKey = (id: string) => `${kind}-cache:generation:${id}`;
    const pending = new Map<string, PendingInvalidation>();
    let overflow: string | undefined;
    let overflowRecovery: Promise<boolean> | undefined;

    const advanceAsync = async (id: string, clearSession: boolean): Promise<StateGeneration> => {
      const key = scopedKey(id);
      const writes: StateWrite[] = [{ kind: "increment", key, ttlMs: GENERATION_TTL_MS }];
      if (clearSession) {
        writes.push({ kind: "delete", key: getStateIntegrationSessionKey(id) });
        writes.push({ kind: "delete", key: `integration-stats:snapshot:v1:${id}` });
      }
      const result = await runAsync((operation) =>
        backing.mutateAsync(
          {
            conditions: [],
            writes,
            readKeys: [globalKey, key],
          },
          operation,
        ),
      );
      return {
        value: combineStateGenerations(result.values[globalKey], result.values[key]),
        isShared: true,
        fence: [globalKey, key].map((readKey) => ({ key: readKey, equals: result.values[readKey] ?? null })),
      };
    };

    const getCachedAsync = async (
      key: string,
      readAsync: () => Promise<StateGeneration>,
      fallback: StateGeneration,
      force = false,
      throwOnError = false,
    ): Promise<StateGeneration> => {
      if (stopped) throw new Error("State generations are stopped");
      if (!force) {
        const cached = reads.get(key);
        if (cached && Date.now() < cached.expiresAt) {
          reads.delete(key);
          reads.set(key, cached);
          return cached.generation;
        }
        if (cached) reads.delete(key);
      }
      const existing = inflight.get(key);
      if (existing) return await existing.promise;
      if (inflight.size >= MAX_READS) {
        if (throwOnError) throw new Error("State generation read limit exceeded");
        return fallback;
      }
      const token = {};
      const promise = (async () => {
        let generation = fallback;
        try {
          generation = await readAsync();
        } catch (error) {
          diagnostics.warn("State generation operation failed", { key, kind }, error);
          if (throwOnError) throw error;
        }
        if (!stopped && inflight.get(key)?.token === token) remember(key, generation);
        return generation;
      })().finally(() => {
        if (inflight.get(key)?.token === token) inflight.delete(key);
      });
      inflight.set(key, { token, promise });
      return await promise;
    };

    const recoverOverflowAsync = async () => {
      if (!overflow) return true;
      if (overflowRecovery) return await overflowRecovery;
      const previous = overflow;
      let work: Promise<boolean>;
      work = (async () => {
        try {
          await runAsync((operation) =>
            backing.mutateAsync(
              {
                conditions: [],
                writes: [{ kind: "increment", key: globalKey, ttlMs: GENERATION_TTL_MS }],
                readKeys: [],
              },
              operation,
            ),
          );
          reads.clear();
          inflight.clear();
          if (overflow !== previous || stopped) return false;
          overflow = undefined;
          return true;
        } catch (error) {
          diagnostics.warn("State invalidation overflow recovery failed", { kind }, error);
          return false;
        }
      })().finally(() => {
        if (overflowRecovery === work) overflowRecovery = undefined;
      });
      overflowRecovery = work;
      return await work;
    };

    const getAsync = async (id: string): Promise<StateGeneration> => {
      if (stopped) throw new Error("State generations are stopped");
      const key = scopedKey(id);
      const invalidation = pending.get(id);
      if (invalidation) {
        const generation = await getCachedAsync(
          key,
          () => advanceAsync(id, invalidation.clearSession),
          unavailable(invalidation.generation),
        );
        if (generation.isShared && pending.get(id)?.generation === invalidation.generation) {
          pending.delete(id);
          return generation;
        }
        const latest = pending.get(id);
        return latest ? unavailable(latest.generation) : generation;
      }
      if (overflow) {
        await recoverOverflowAsync();
        if (overflow) return unavailable(overflow);
      }
      return await getCachedAsync(
        key,
        async () => {
          const result = await runAsync((operation) => backing.readAsync([globalKey, key], operation));
          return {
            value: combineStateGenerations(result.values[globalKey], result.values[key]),
            isShared: true,
            fence: [globalKey, key].map((readKey) => ({ key: readKey, equals: result.values[readKey] ?? null })),
          };
        },
        unavailable("state-unavailable"),
      );
    };

    const invalidateAsync = async (id: string, clearSession: boolean) => {
      if (stopped) throw new Error("State generations are stopped");
      const key = scopedKey(id);
      const previous = pending.get(id);
      const invalidation = {
        generation: `local-${randomUUID()}`,
        clearSession: clearSession || previous?.clearSession === true,
      };
      const canTrack = !overflow && (previous !== undefined || pending.size < MAX_PENDING);
      if (canTrack) pending.set(id, invalidation);
      else overflow = invalidation.generation;
      inflight.delete(key);
      remember(key, unavailable(invalidation.generation));
      let generation: StateGeneration;
      try {
        generation = await getCachedAsync(
          key,
          () => advanceAsync(id, invalidation.clearSession),
          unavailable(invalidation.generation),
          true,
          clearSession,
        );
      } catch (error) {
        if (!canTrack) overflow = invalidation.generation;
        throw error;
      }
      if (!generation.isShared && !canTrack) overflow = invalidation.generation;
      if (generation.isShared && pending.get(id)?.generation === invalidation.generation) pending.delete(id);
    };

    return { getAsync, invalidateAsync };
  };

  const integration = createScope("integration");
  const widget = createScope("widget");
  return {
    getIntegrationCacheGenerationAsync: integration.getAsync,
    getWidgetCacheGenerationAsync: widget.getAsync,
    invalidateIntegrationCacheAsync: async (id: string) => await integration.invalidateAsync(id, true),
    invalidateIntegrationResponseCacheAsync: async (id: string) => await integration.invalidateAsync(id, false),
    invalidateWidgetCacheAsync: async (namespace: string) => await widget.invalidateAsync(namespace, false),
    stop: () => {
      stopped = true;
      lifetime.abort(new Error("State generations are stopped"));
      reads.clear();
      inflight.clear();
    },
  };
};

export type StateGenerations = ReturnType<typeof createStateGenerations>;
