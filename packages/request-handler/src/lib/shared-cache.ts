import { createHash } from "node:crypto";

import { serialize } from "superjson";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import {
  createGetSetChannel,
  createLockChannel,
  getIntegrationCacheGenerationAsync,
  getWidgetCacheGenerationAsync,
} from "@homarr/redis";
import type { IntegrationCacheGeneration, WidgetCacheGeneration } from "@homarr/redis";

import type { CacheEntry, SharedCacheAdapter } from "./request-handler";

const logger = createLogger({ module: "sharedRequestCache" });
const REDIS_OPERATION_TIMEOUT_MS = 250;
const REFRESH_LOCK_TTL_SECONDS = 15;
const namespacePattern = /^[a-z0-9][a-z0-9:-]*$/;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

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
    const timer = setTimeout(() => reject(new Error("Redis operation timed out")), durationMs);
    timer.unref?.();
    void promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
};

const isCacheEntry = (value: unknown): value is CacheEntry<unknown> => {
  if (!isRecord(value)) return false;
  return (
    value.timestamp instanceof Date &&
    typeof value.expiresAt === "number" &&
    Number.isFinite(value.expiresAt) &&
    typeof value.staleUntil === "number" &&
    Number.isFinite(value.staleUntil)
  );
};

interface IntegrationSharedCacheOptions {
  namespace: string;
  integrationId: string;
  cacheOptions: Record<string, unknown>;
}

interface RedisSharedCacheOptions {
  namespace: string;
  cacheKind: "integration" | "widget";
  cacheIdentity: string;
  generation: string;
  metadata?: Record<string, string>;
  isShared?: boolean;
}

const logRedisFailure = (operation: string, metadata: Record<string, unknown>, error: unknown) => {
  logger.warn(
    new ErrorWithMetadata(
      "Redis response cache operation failed",
      {
        ...metadata,
        operation,
      },
      { cause: error },
    ),
  );
};

const createRedisSharedCache = <TData>({
  namespace,
  cacheKind,
  cacheIdentity,
  generation,
  metadata = {},
  isShared: initialIsShared = true,
}: RedisSharedCacheOptions): SharedCacheAdapter<TData> => {
  const logMetadata = { cacheNamespace: namespace, cacheKind, ...metadata };
  const payloadChannel = createGetSetChannel<CacheEntry<TData>>(
    `${cacheKind}-cache:payload:v1:${namespace}:${generation}:${cacheIdentity}`,
  );
  const lock = createLockChannel(`${cacheKind}-cache:lock:v1:${namespace}:${generation}:${cacheIdentity}`);
  let isShared = initialIsShared;

  const runRedisOperationAsync = async <T>(operation: string, callback: () => Promise<T>, fallback: T): Promise<T> => {
    if (!isShared) return fallback;
    try {
      return await withTimeoutAsync(callback(), REDIS_OPERATION_TIMEOUT_MS);
    } catch (error) {
      isShared = false;
      logRedisFailure(operation, logMetadata, error);
      return fallback;
    }
  };

  return {
    generation,
    get isShared() {
      return isShared;
    },
    getAsync: async () => {
      const value = await runRedisOperationAsync("payload-read", () => payloadChannel.getAsync(), undefined);
      if (value === undefined || value === null) return value;
      if (isCacheEntry(value)) return value;

      logger.warn("Ignored invalid Redis response cache entry", {
        ...logMetadata,
        operation: "payload-validate",
      });
      await runRedisOperationAsync("payload-remove", () => payloadChannel.removeAsync(), undefined);
      return null;
    },
    setAsync: async (entry) => {
      const retentionMs = entry.staleUntil - Date.now();
      if (retentionMs <= 0) return;
      await runRedisOperationAsync(
        "payload-write",
        () => payloadChannel.setAsync(entry, { ttlMs: retentionMs }),
        undefined,
      );
    },
    acquireRefreshLockAsync: async () =>
      await runRedisOperationAsync(
        "refresh-lock-acquire",
        () => lock.acquireAsync(REFRESH_LOCK_TTL_SECONDS),
        undefined,
      ),
    renewRefreshLockAsync: async (token) =>
      await runRedisOperationAsync(
        "refresh-lock-renew",
        () => lock.renewAsync(token, REFRESH_LOCK_TTL_SECONDS),
        undefined,
      ),
    releaseRefreshLockAsync: async (token) => {
      await runRedisOperationAsync("refresh-lock-release", () => lock.releaseAsync(token), undefined);
    },
  };
};

interface WidgetSharedCacheOptions {
  namespace: string;
  cacheInput: Record<string, unknown>;
}

export const createWidgetSharedCacheAsync = async <TData>({
  namespace,
  cacheInput,
}: WidgetSharedCacheOptions): Promise<SharedCacheAdapter<TData>> => {
  if (typeof window !== "undefined") throw new Error("Widget request caching is server-only");
  if (!namespacePattern.test(namespace)) throw new Error(`Invalid widget cache namespace '${namespace}'`);

  const metadata = { cacheNamespace: namespace };
  let generation: WidgetCacheGeneration;
  try {
    generation = await getWidgetCacheGenerationAsync(namespace);
  } catch (error) {
    logRedisFailure("generation-read", metadata, error);
    generation = { value: "redis-unavailable", isShared: false };
  }

  return createRedisSharedCache<TData>({
    namespace,
    cacheKind: "widget",
    cacheIdentity: hashSharedCacheInput(cacheInput),
    generation: generation.value,
    isShared: generation.isShared,
  });
};

export const createIntegrationSharedCacheAsync = async <TData>({
  namespace,
  integrationId,
  cacheOptions,
}: IntegrationSharedCacheOptions): Promise<SharedCacheAdapter<TData>> => {
  if (typeof window !== "undefined") throw new Error("Integration request caching is server-only");
  if (!namespacePattern.test(namespace)) throw new Error(`Invalid integration cache namespace '${namespace}'`);

  const metadata = { cacheNamespace: namespace, integrationId };
  let generation: IntegrationCacheGeneration;
  try {
    generation = await getIntegrationCacheGenerationAsync(integrationId);
  } catch (error) {
    logRedisFailure("generation-read", metadata, error);
    generation = { value: "redis-unavailable", isShared: false };
  }

  const optionsHash = hashIntegrationCacheOptions(cacheOptions);
  const sharedCache = createRedisSharedCache<TData>({
    namespace,
    cacheKind: "integration",
    cacheIdentity: `${integrationId}:${optionsHash}`,
    generation: generation.value,
    metadata: { integrationId },
    isShared: generation.isShared,
  });
  return sharedCache;
};
