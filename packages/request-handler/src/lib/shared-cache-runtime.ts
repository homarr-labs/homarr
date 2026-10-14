import { createHash } from "node:crypto";

import { serialize } from "superjson";

import { isRecord } from "@homarr/common/object";
import type { StateChannels, StateCondition, StateDiagnostics, StateGeneration } from "@homarr/redis/state";

import type { CacheEntry, SharedCacheAdapter } from "./request-handler";

const STATE_OPERATION_TIMEOUT_MS = 750;
const REFRESH_LOCK_TTL_SECONDS = 15;
const SHARED_CACHE_ENVELOPE_VERSION = 2;
const DEFAULT_HANDLER_CACHE_VERSION = "v1";
const namespacePattern = /^[a-z0-9][a-z0-9:-]*$/;
const cacheVersionPattern = /^[a-z0-9][a-z0-9._-]*$/;
const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value).toSorted()) {
    result[key] = canonicalize(value[key]);
  }
  return result;
};

export const hashSharedCacheInput = (options: Record<string, unknown>) => {
  const serialized = JSON.stringify(canonicalize(serialize(options)));
  return createHash("sha256").update(serialized).digest("hex");
};

export const hashIntegrationCacheOptions = hashSharedCacheInput;

const withTimeoutAsync = async <T>(promise: Promise<T>, durationMs: number): Promise<T> => {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("State operation timed out")), durationMs);
    timer.unref?.();
    void promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
};

interface SharedCacheEnvelope<TData> {
  version: typeof SHARED_CACHE_ENVELOPE_VERSION;
  entry: CacheEntry<TData>;
}

const isSharedCacheEnvelope = (value: unknown): value is SharedCacheEnvelope<unknown> => {
  if (!isRecord(value) || value.version !== SHARED_CACHE_ENVELOPE_VERSION || !isRecord(value.entry)) return false;

  const entry = value.entry;
  if (!Object.hasOwn(entry, "data") || !(entry.timestamp instanceof Date)) return false;
  const timestamp = entry.timestamp.getTime();
  return (
    Number.isFinite(timestamp) &&
    typeof entry.expiresAt === "number" &&
    Number.isFinite(entry.expiresAt) &&
    typeof entry.staleUntil === "number" &&
    Number.isFinite(entry.staleUntil) &&
    timestamp <= entry.expiresAt &&
    entry.expiresAt <= entry.staleUntil
  );
};

interface IntegrationSharedCacheOptions {
  namespace: string;
  integrationId: string;
  cacheIdentity: string;
  cacheVersion?: string;
}

interface StateSharedCacheOptions {
  namespace: string;
  cacheKind: "integration" | "widget";
  cacheIdentity: string;
  cacheVersion: string;
  generation: string;
  metadata?: Record<string, string>;
  isShared?: boolean;
  fence: readonly StateCondition[];
}

export interface SharedCacheResources {
  channels: StateChannels;
  getIntegrationCacheGenerationAsync(integrationId: string): Promise<StateGeneration>;
  getWidgetCacheGenerationAsync(namespace: string): Promise<StateGeneration>;
  diagnostics: StateDiagnostics;
}

export const createSharedCacheRuntime = (resources: SharedCacheResources) => {
  const { createGetSetChannel, createLockChannel } = resources.channels;
  const { getIntegrationCacheGenerationAsync, getWidgetCacheGenerationAsync } = resources;
  const logStateFailure = (operation: string, metadata: Record<string, unknown>, error: unknown) => {
    resources.diagnostics.warn("Response cache operation failed", { ...metadata, operation }, error);
  };

  const createStateSharedCache = <TData>({
    namespace,
    cacheKind,
    cacheIdentity,
    cacheVersion,
    generation,
    metadata = {},
    isShared: initialIsShared = true,
    fence,
  }: StateSharedCacheOptions): SharedCacheAdapter<TData> => {
    const logMetadata = { cacheNamespace: namespace, cacheKind, ...metadata };
    const payloadName = `${cacheKind}-cache:payload:v2:${cacheVersion}:${namespace}:${generation}:${cacheIdentity}`;
    const lockName = `${cacheKind}-cache:lock:v2:${cacheVersion}:${namespace}:${generation}:${cacheIdentity}`;
    const payloadChannel = createGetSetChannel<unknown>(payloadName);
    const lock = createLockChannel(lockName);
    let isShared = initialIsShared;

    const runStateOperationAsync = async <T>(
      operation: string,
      callback: () => Promise<T>,
      fallback: T,
    ): Promise<T> => {
      if (!isShared) return fallback;
      try {
        return await withTimeoutAsync(callback(), STATE_OPERATION_TIMEOUT_MS);
      } catch (error) {
        isShared = false;
        logStateFailure(operation, logMetadata, error);
        return fallback;
      }
    };

    return {
      generation,
      get isShared() {
        return isShared;
      },
      getAsync: async () => {
        const value = await runStateOperationAsync("payload-read", () => payloadChannel.getAsync(), undefined);
        if (value === undefined || value === null) return value;
        if (isSharedCacheEnvelope(value)) return value.entry as CacheEntry<TData>;

        resources.diagnostics.warn("Ignored invalid response cache entry", {
          ...logMetadata,
          operation: "payload-validate",
        });
        await runStateOperationAsync("payload-remove", () => payloadChannel.removeAsync(), undefined);
        return null;
      },
      setAsync: async (entry, refreshLockToken) => {
        const retentionMs = entry.staleUntil - Date.now();
        if (retentionMs <= 0) return false;
        const envelope: SharedCacheEnvelope<TData> = {
          version: SHARED_CACHE_ENVELOPE_VERSION,
          entry,
        };
        return await runStateOperationAsync(
          "payload-write",
          () => lock.setIfOwnedAsync(refreshLockToken, payloadName, envelope, retentionMs, fence),
          undefined,
        );
      },
      acquireRefreshLockAsync: async () =>
        await runStateOperationAsync(
          "refresh-lock-acquire",
          () => lock.acquireAsync(REFRESH_LOCK_TTL_SECONDS),
          undefined,
        ),
      renewRefreshLockAsync: async (token) =>
        await runStateOperationAsync(
          "refresh-lock-renew",
          () => lock.renewAsync(token, REFRESH_LOCK_TTL_SECONDS),
          undefined,
        ),
      releaseRefreshLockAsync: async (token) => {
        try {
          await withTimeoutAsync(lock.releaseAsync(token), STATE_OPERATION_TIMEOUT_MS);
        } catch (error) {
          logStateFailure("refresh-lock-release", logMetadata, error);
        }
      },
    };
  };

  interface WidgetSharedCacheOptions {
    namespace: string;
    cacheIdentity: string;
    cacheVersion?: string;
  }

  const createWidgetSharedCacheAsync = async <TData>({
    namespace,
    cacheIdentity,
    cacheVersion = DEFAULT_HANDLER_CACHE_VERSION,
  }: WidgetSharedCacheOptions): Promise<SharedCacheAdapter<TData>> => {
    if (typeof window !== "undefined") throw new Error("Widget request caching is server-only");
    if (!namespacePattern.test(namespace)) throw new Error(`Invalid widget cache namespace '${namespace}'`);
    if (!cacheVersionPattern.test(cacheVersion)) throw new Error(`Invalid widget cache version '${cacheVersion}'`);

    const metadata = { cacheNamespace: namespace };
    let generation: StateGeneration;
    try {
      generation = await getWidgetCacheGenerationAsync(namespace);
    } catch (error) {
      logStateFailure("generation-read", metadata, error);
      generation = { value: "state-unavailable", isShared: false, fence: [] };
    }

    return createStateSharedCache<TData>({
      namespace,
      cacheKind: "widget",
      cacheIdentity,
      cacheVersion,
      generation: generation.value,
      isShared: generation.isShared,
      fence: generation.fence,
    });
  };

  const createIntegrationSharedCacheAsync = async <TData>({
    namespace,
    integrationId,
    cacheIdentity,
    cacheVersion = DEFAULT_HANDLER_CACHE_VERSION,
  }: IntegrationSharedCacheOptions): Promise<SharedCacheAdapter<TData>> => {
    if (typeof window !== "undefined") throw new Error("Integration request caching is server-only");
    if (!namespacePattern.test(namespace)) throw new Error(`Invalid integration cache namespace '${namespace}'`);
    if (!cacheVersionPattern.test(cacheVersion)) throw new Error(`Invalid integration cache version '${cacheVersion}'`);

    const metadata = { cacheNamespace: namespace, integrationId };
    let generation: StateGeneration;
    try {
      generation = await getIntegrationCacheGenerationAsync(integrationId);
    } catch (error) {
      logStateFailure("generation-read", metadata, error);
      generation = { value: "state-unavailable", isShared: false, fence: [] };
    }

    const sharedCache = createStateSharedCache<TData>({
      namespace,
      cacheKind: "integration",
      cacheIdentity,
      cacheVersion,
      generation: generation.value,
      metadata: { integrationId },
      isShared: generation.isShared,
      fence: generation.fence,
    });
    return sharedCache;
  };
  return { createWidgetSharedCacheAsync, createIntegrationSharedCacheAsync };
};

export type SharedCacheRuntime = ReturnType<typeof createSharedCacheRuntime>;
