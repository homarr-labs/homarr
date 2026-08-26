import superjson from "superjson";

import { createId } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import { ChannelSubscriptionTracker } from "./channel-subscription-tracker";
import { createRedisConnection, requireRedisConnection } from "./connection";

const publisher = createRedisConnection();
const lastDataClient = createRedisConnection();
const logger = createLogger({ module: "redisChannel" });
const boundedCacheClient = createRedisConnection({
  autoResendUnfulfilledCommands: false,
  commandTimeout: 500,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
});

interface RedisChannelOptions {
  useBoundedCacheClient?: boolean;
}

const selectRedisClient = (options: RedisChannelOptions) => {
  if (options.useBoundedCacheClient) return boundedCacheClient;
  return getSetClient;
};

/**
 * Creates a new pub/sub channel.
 * @param name name of the channel
 * @returns pub/sub channel object
 */
export const createSubPubChannel = <TData>(name: string, { persist }: { persist: boolean } = { persist: true }) => {
  const lastChannelName = `pubSub:last:${name}`;
  const channelName = `pubSub:${name}`;
  return {
    /**
     * Subscribes to the channel and calls the callback with the last data saved - when present.
     * @param callback callback function to be called when new data is published
     */
    subscribe: (callback: (data: TData) => void) => {
      if (persist) {
        void requireRedisConnection(lastDataClient)
          .get(lastChannelName)
          .then((data) => {
            if (data) {
              callback(superjson.parse(data));
            }
          });
      }
      return ChannelSubscriptionTracker.subscribe(channelName, (message) => {
        callback(superjson.parse(message));
      });
    },
    /**
     * Publish data to the channel with last data saved.
     * @param data data to be published
     */
    publishAsync: async (data: TData) => {
      if (persist) {
        await requireRedisConnection(lastDataClient).set(lastChannelName, superjson.stringify(data));
      }
      await requireRedisConnection(publisher).publish(channelName, superjson.stringify(data));
    },
    getLastDataAsync: async () => {
      const data = await requireRedisConnection(lastDataClient).get(lastChannelName);
      return data ? superjson.parse<TData>(data) : null;
    },
  };
};

const getSetClient = createRedisConnection();

/**
 * Creates a new redis channel for a list
 * @param name name of channel
 * @returns list channel object
 */
export const createListChannel = <TItem>(name: string) => {
  const listChannelName = `list:${name}`;
  return {
    /**
     * Get all items in list
     * @returns an array of all items
     */
    getAllAsync: async () => {
      const items = await requireRedisConnection(getSetClient).lrange(listChannelName, 0, -1);
      return items.map((item) => superjson.parse<TItem>(item));
    },
    /**
     * Remove an item from the channels list by item
     * @param item item to remove
     */
    removeAsync: async (item: TItem) => {
      await requireRedisConnection(getSetClient).lrem(listChannelName, 0, superjson.stringify(item));
    },
    /**
     * Clear all items from the channels list
     */
    clearAsync: async () => {
      await requireRedisConnection(getSetClient).del(listChannelName);
    },
    /**
     * Add an item to the channels list
     * @param item item to add
     */
    addAsync: async (item: TItem) => {
      await requireRedisConnection(getSetClient).lpush(listChannelName, superjson.stringify(item));
    },
  };
};

/**
 * Creates a new redis channel for getting and setting data
 * @param name name of channel
 */
export const createGetSetChannel = <TData>(name: string, options: RedisChannelOptions = {}) => {
  const client = selectRedisClient(options);
  return {
    /**
     * Get data from the channel
     * @returns data or null if not found
     */
    getAsync: async () => {
      const data = await requireRedisConnection(client).get(name);
      return data ? superjson.parse<TData>(data) : null;
    },
    /**
     * Set data in the channel
     * @param data data to be stored in the channel
     * @param options optional TTL in seconds or milliseconds
     */
    setAsync: async (data: TData, options?: { ttlSeconds?: number; ttlMs?: number }) => {
      if (options?.ttlMs !== undefined) {
        if (options.ttlMs <= 0) {
          await requireRedisConnection(client).del(name);
          return;
        }
        await requireRedisConnection(client).set(name, superjson.stringify(data), "PX", options.ttlMs);
        return;
      }
      if (options?.ttlSeconds) {
        await requireRedisConnection(client).set(name, superjson.stringify(data), "EX", options.ttlSeconds);
        return;
      }
      await requireRedisConnection(client).set(name, superjson.stringify(data));
    },
    /**
     * Remove data from the channel
     */
    removeAsync: async () => {
      await requireRedisConnection(client).del(name);
    },
  };
};

/**
 * Creates a short-lived distributed lock.
 *
 * The token prevents a process from releasing a lock that expired and was
 * acquired by another process in the meantime.
 */
export const createLockChannel = (name: string, options: RedisChannelOptions = {}) => {
  const selectedClient = selectRedisClient(options);
  const releaseIfOwnedAsync = async (token: string) => {
    if (!selectedClient) return;

    await selectedClient.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      name,
      token,
    );
  };

  return {
    acquireAsync: async (ttlSeconds: number) => {
      const token = createId();
      const client = selectedClient;
      if (!client) return token;

      try {
        const result = await client.set(name, token, "EX", ttlSeconds, "NX");
        return result === "OK" ? token : null;
      } catch (error) {
        // The SET may have reached Redis even when its reply timed out. Queue a
        // token-fenced cleanup so an ambiguous acquisition cannot orphan a lock.
        void releaseIfOwnedAsync(token).catch(() => undefined);
        throw error;
      }
    },
    renewAsync: async (token: string, ttlSeconds: number) => {
      const client = selectedClient;
      if (!client) return true;

      const result = await client.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], ARGV[2]) else return 0 end",
        1,
        name,
        token,
        ttlSeconds,
      );
      return result === 1;
    },
    setIfOwnedAsync: async <TData>(token: string, targetName: string, data: TData, ttlMs: number) => {
      const client = selectedClient;
      if (!client) return true;

      const result = await client.eval(
        "if redis.call('get', KEYS[1]) ~= ARGV[1] then return 0 end redis.call('set', KEYS[2], ARGV[2], 'PX', ARGV[3]) return 1",
        2,
        name,
        targetName,
        token,
        superjson.stringify(data),
        ttlMs,
      );
      return result === 1;
    },
    releaseAsync: async (token: string) => {
      await releaseIfOwnedAsync(token);
    },
  };
};

const integrationCacheGenerationKey = (integrationId: string) => `integration-cache:generation:${integrationId}`;
const integrationCacheGlobalGenerationKey = "integration-cache:global-generation:v1";
export const getIntegrationSessionStoreKey = (integrationId: string) => `session-store:${integrationId}`;
interface PendingIntegrationCacheInvalidation {
  generation: string;
  clearSession: boolean;
}

const pendingIntegrationCacheInvalidations = new Map<string, PendingIntegrationCacheInvalidation>();
let integrationCacheOverflowGeneration: string | undefined;
const MAX_PENDING_INTEGRATION_CACHE_INVALIDATIONS = 1000;
const CACHE_GENERATION_REDIS_TIMEOUT_MS = 750;
const CACHE_GENERATION_SUCCESS_TTL_MS = 1000;
const CACHE_GENERATION_UNAVAILABLE_TTL_MS = 5000;
const CACHE_GENERATION_REDIS_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_CACHE_GENERATION_READS = 1000;

export interface IntegrationCacheGeneration {
  value: string;
  isShared: boolean;
}

interface CacheGenerationReadEntry {
  generation: IntegrationCacheGeneration;
  expiresAt: number;
}

interface CacheGenerationReadInFlight {
  promise: Promise<IntegrationCacheGeneration>;
  token: object;
}

const cacheGenerationReads = new Map<string, CacheGenerationReadEntry>();
const cacheGenerationReadsInFlight = new Map<string, CacheGenerationReadInFlight>();

const logCacheGenerationFailure = (message: string, metadata: Record<string, unknown>, error: unknown) => {
  logger.warn(new ErrorWithMetadata(message, metadata, { cause: error }));
};

const withCacheGenerationRedisTimeoutAsync = async <T>(promise: Promise<T>): Promise<T> => {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Redis cache generation operation timed out")),
      CACHE_GENERATION_REDIS_TIMEOUT_MS,
    );
    timer.unref?.();
    void promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
};

const combineCacheGenerations = (
  globalGeneration: string | null | undefined,
  scopedGeneration: string | null | undefined,
) => {
  const scopedValue = scopedGeneration ?? "0";
  if (!globalGeneration || globalGeneration === "0") return scopedValue;
  return `${globalGeneration}:${scopedValue}`;
};

const advanceGlobalCacheGenerationAsync = async (cacheKey: string) => {
  const client = boundedCacheClient;
  if (!client) return null;

  const results = await withCacheGenerationRedisTimeoutAsync(
    client.multi().incr(cacheKey).expire(cacheKey, CACHE_GENERATION_REDIS_TTL_SECONDS).exec(),
  );
  const generationResult = results?.[0];
  const expiryResult = results?.[1];
  if (!generationResult || generationResult[0]) throw generationResult?.[0] ?? new Error("Missing generation result");
  if (!expiryResult || expiryResult[0]) throw expiryResult?.[0] ?? new Error("Missing generation expiry result");
  return String(generationResult[1]);
};

const setCacheGenerationRead = (
  cacheKey: string,
  generation: IntegrationCacheGeneration,
  ttlMs = generation.isShared ? CACHE_GENERATION_SUCCESS_TTL_MS : CACHE_GENERATION_UNAVAILABLE_TTL_MS,
) => {
  if (cacheGenerationReads.has(cacheKey)) cacheGenerationReads.delete(cacheKey);
  while (cacheGenerationReads.size >= MAX_CACHE_GENERATION_READS) {
    const oldestCacheKey = cacheGenerationReads.keys().next().value;
    if (!oldestCacheKey) break;
    cacheGenerationReads.delete(oldestCacheKey);
  }
  cacheGenerationReads.set(cacheKey, {
    generation,
    expiresAt: Date.now() + ttlMs,
  });
};

const beginCacheGenerationInvalidation = (cacheKey: string, pendingGeneration: string) => {
  cacheGenerationReadsInFlight.delete(cacheKey);
  setCacheGenerationRead(cacheKey, { value: pendingGeneration, isShared: false });
};

interface GetCachedGenerationOptions {
  cacheKey: string;
  readAsync: () => Promise<string | null>;
  fallback: IntegrationCacheGeneration;
  errorMessage: string;
  errorMetadata: Record<string, unknown>;
  force?: boolean;
  throwOnError?: boolean;
}

const getCachedGenerationAsync = async ({
  cacheKey,
  readAsync,
  fallback,
  errorMessage,
  errorMetadata,
  force = false,
  throwOnError = false,
}: GetCachedGenerationOptions): Promise<IntegrationCacheGeneration> => {
  if (!force) {
    const cached = cacheGenerationReads.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      cacheGenerationReads.delete(cacheKey);
      cacheGenerationReads.set(cacheKey, cached);
      return cached.generation;
    }
    if (cached) cacheGenerationReads.delete(cacheKey);
  }

  const existing = cacheGenerationReadsInFlight.get(cacheKey);
  if (existing) return await existing.promise;

  const token = {};
  const promise = (async () => {
    let generation = fallback;
    try {
      const value = await readAsync();
      if (value !== null) generation = { value, isShared: true };
    } catch (error) {
      logCacheGenerationFailure(errorMessage, errorMetadata, error);
      if (throwOnError) throw error;
    }

    if (cacheGenerationReadsInFlight.get(cacheKey)?.token === token) {
      setCacheGenerationRead(cacheKey, generation);
    }
    return generation;
  })().finally(() => {
    if (cacheGenerationReadsInFlight.get(cacheKey)?.token === token) {
      cacheGenerationReadsInFlight.delete(cacheKey);
    }
  });
  cacheGenerationReadsInFlight.set(cacheKey, { promise, token });
  return await promise;
};

const advanceIntegrationCacheGenerationAsync = async (integrationId: string) => {
  const client = boundedCacheClient;
  if (!client) return null;

  const results = await withCacheGenerationRedisTimeoutAsync(
    client
      .multi()
      .incr(integrationCacheGenerationKey(integrationId))
      .expire(integrationCacheGenerationKey(integrationId), CACHE_GENERATION_REDIS_TTL_SECONDS)
      .del(getIntegrationSessionStoreKey(integrationId))
      .get(integrationCacheGlobalGenerationKey)
      .exec(),
  );
  const generationResult = results?.[0];
  const expiryResult = results?.[1];
  const sessionResult = results?.[2];
  const globalGenerationResult = results?.[3];
  if (!generationResult || generationResult[0]) throw generationResult?.[0] ?? new Error("Missing generation result");
  if (!expiryResult || expiryResult[0]) throw expiryResult?.[0] ?? new Error("Missing generation expiry result");
  if (!sessionResult || sessionResult[0]) throw sessionResult?.[0] ?? new Error("Missing session result");
  if (!globalGenerationResult || globalGenerationResult[0]) {
    throw globalGenerationResult?.[0] ?? new Error("Missing global generation result");
  }
  return combineCacheGenerations(globalGenerationResult[1] as string | null, String(generationResult[1]));
};

const advanceIntegrationResponseCacheGenerationAsync = async (integrationId: string) => {
  const client = boundedCacheClient;
  if (!client) return null;

  const cacheKey = integrationCacheGenerationKey(integrationId);
  const results = await withCacheGenerationRedisTimeoutAsync(
    client
      .multi()
      .incr(cacheKey)
      .expire(cacheKey, CACHE_GENERATION_REDIS_TTL_SECONDS)
      .get(integrationCacheGlobalGenerationKey)
      .exec(),
  );
  const generationResult = results?.[0];
  const expiryResult = results?.[1];
  const globalGenerationResult = results?.[2];
  if (!generationResult || generationResult[0]) throw generationResult?.[0] ?? new Error("Missing generation result");
  if (!expiryResult || expiryResult[0]) throw expiryResult?.[0] ?? new Error("Missing generation expiry result");
  if (!globalGenerationResult || globalGenerationResult[0]) {
    throw globalGenerationResult?.[0] ?? new Error("Missing global generation result");
  }
  return combineCacheGenerations(globalGenerationResult[1] as string | null, String(generationResult[1]));
};

const getIntegrationCacheInvalidationOperation = (clearSession: boolean) => {
  if (clearSession) {
    return {
      advanceAsync: advanceIntegrationCacheGenerationAsync,
      operation: "generation-advance-and-session-delete",
      failureMessage: "Failed to invalidate integration and session caches in Redis",
    };
  }
  return {
    advanceAsync: advanceIntegrationResponseCacheGenerationAsync,
    operation: "generation-advance",
    failureMessage: "Failed to invalidate integration response caches in Redis",
  };
};

let integrationCacheOverflowRecoveryInFlight: Promise<boolean> | undefined;

const recoverIntegrationCacheOverflowAsync = async () => {
  if (!integrationCacheOverflowGeneration) return true;
  if (integrationCacheOverflowRecoveryInFlight) return await integrationCacheOverflowRecoveryInFlight;

  const overflowGeneration = integrationCacheOverflowGeneration;
  let promise: Promise<boolean>;
  promise = (async () => {
    try {
      const generation = await advanceGlobalCacheGenerationAsync(integrationCacheGlobalGenerationKey);
      if (generation === null) return false;

      cacheGenerationReads.clear();
      cacheGenerationReadsInFlight.clear();
      if (integrationCacheOverflowGeneration !== overflowGeneration) return false;
      integrationCacheOverflowGeneration = undefined;
      return true;
    } catch (error) {
      logCacheGenerationFailure(
        "Failed to recover integration cache invalidation overflow",
        { operation: "global-generation-advance" },
        error,
      );
      return false;
    }
  })().finally(() => {
    if (integrationCacheOverflowRecoveryInFlight === promise) {
      integrationCacheOverflowRecoveryInFlight = undefined;
    }
  });
  integrationCacheOverflowRecoveryInFlight = promise;
  return await promise;
};

export const getIntegrationCacheGenerationAsync = async (
  integrationId: string,
): Promise<IntegrationCacheGeneration> => {
  const cacheKey = integrationCacheGenerationKey(integrationId);
  const pendingInvalidation = pendingIntegrationCacheInvalidations.get(integrationId);
  if (pendingInvalidation) {
    const invalidationOperation = getIntegrationCacheInvalidationOperation(pendingInvalidation.clearSession);
    const generation = await getCachedGenerationAsync({
      cacheKey,
      readAsync: async () => await invalidationOperation.advanceAsync(integrationId),
      fallback: { value: pendingInvalidation.generation, isShared: false },
      errorMessage: "Failed to retry integration cache invalidation",
      errorMetadata: {
        integrationId,
        operation: invalidationOperation.operation,
      },
    });
    if (
      generation.isShared &&
      pendingIntegrationCacheInvalidations.get(integrationId)?.generation === pendingInvalidation.generation
    ) {
      pendingIntegrationCacheInvalidations.delete(integrationId);
      return generation;
    }
    const latestPendingInvalidation = pendingIntegrationCacheInvalidations.get(integrationId);
    if (latestPendingInvalidation) return { value: latestPendingInvalidation.generation, isShared: false };
    return generation;
  }

  if (integrationCacheOverflowGeneration) {
    await recoverIntegrationCacheOverflowAsync();
    if (integrationCacheOverflowGeneration) {
      return { value: integrationCacheOverflowGeneration, isShared: false };
    }
  }

  const client = boundedCacheClient;
  return await getCachedGenerationAsync({
    cacheKey,
    readAsync: async () => {
      if (!client) return null;
      const [globalGeneration, scopedGeneration] = await withCacheGenerationRedisTimeoutAsync(
        client.mget(integrationCacheGlobalGenerationKey, cacheKey),
      );
      return combineCacheGenerations(globalGeneration, scopedGeneration);
    },
    fallback: { value: "redis-unavailable", isShared: false },
    errorMessage: "Failed to read integration cache generation",
    errorMetadata: { integrationId, operation: "generation-read" },
  });
};

const invalidateIntegrationCacheGenerationAsync = async (
  integrationId: string,
  clearSession: boolean,
): Promise<void> => {
  const previousInvalidation = pendingIntegrationCacheInvalidations.get(integrationId);
  const pendingInvalidation: PendingIntegrationCacheInvalidation = {
    generation: `local-${createId()}`,
    clearSession: clearSession || previousInvalidation?.clearSession === true,
  };
  const canTrackInvalidation =
    !integrationCacheOverflowGeneration &&
    (previousInvalidation !== undefined ||
      pendingIntegrationCacheInvalidations.size < MAX_PENDING_INTEGRATION_CACHE_INVALIDATIONS);
  if (canTrackInvalidation) {
    pendingIntegrationCacheInvalidations.set(integrationId, pendingInvalidation);
  } else if (integrationCacheOverflowGeneration) {
    integrationCacheOverflowGeneration = pendingInvalidation.generation;
  }
  const cacheKey = integrationCacheGenerationKey(integrationId);
  beginCacheGenerationInvalidation(cacheKey, pendingInvalidation.generation);
  const invalidationOperation = getIntegrationCacheInvalidationOperation(pendingInvalidation.clearSession);

  let generation: IntegrationCacheGeneration;
  try {
    generation = await getCachedGenerationAsync({
      cacheKey,
      readAsync: async () => await invalidationOperation.advanceAsync(integrationId),
      fallback: { value: pendingInvalidation.generation, isShared: false },
      errorMessage: invalidationOperation.failureMessage,
      errorMetadata: {
        integrationId,
        operation: invalidationOperation.operation,
      },
      force: true,
      throwOnError: clearSession,
    });
  } catch (error) {
    if (!canTrackInvalidation) integrationCacheOverflowGeneration = pendingInvalidation.generation;
    throw error;
  }
  if (!generation.isShared && !canTrackInvalidation) {
    integrationCacheOverflowGeneration = pendingInvalidation.generation;
  }
  if (
    generation.isShared &&
    pendingIntegrationCacheInvalidations.get(integrationId)?.generation === pendingInvalidation.generation
  ) {
    pendingIntegrationCacheInvalidations.delete(integrationId);
  }
};

export const invalidateIntegrationCacheAsync = async (integrationId: string): Promise<void> => {
  await invalidateIntegrationCacheGenerationAsync(integrationId, true);
};

/** Advances response-cache generation without evicting cached integration credentials. */
export const invalidateIntegrationResponseCacheAsync = async (integrationId: string): Promise<void> => {
  await invalidateIntegrationCacheGenerationAsync(integrationId, false);
};

const widgetCacheGenerationKey = (namespace: string) => `widget-cache:generation:${namespace}`;
const widgetCacheGlobalGenerationKey = "widget-cache:global-generation:v1";
const pendingWidgetCacheInvalidations = new Map<string, string>();
let widgetCacheOverflowGeneration: string | undefined;
const MAX_PENDING_WIDGET_CACHE_INVALIDATIONS = 1000;

const advanceWidgetCacheGenerationAsync = async (namespace: string) => {
  const client = boundedCacheClient;
  if (!client) return null;

  const cacheKey = widgetCacheGenerationKey(namespace);
  const results = await withCacheGenerationRedisTimeoutAsync(
    client
      .multi()
      .incr(cacheKey)
      .expire(cacheKey, CACHE_GENERATION_REDIS_TTL_SECONDS)
      .get(widgetCacheGlobalGenerationKey)
      .exec(),
  );
  const generationResult = results?.[0];
  const expiryResult = results?.[1];
  const globalGenerationResult = results?.[2];
  if (!generationResult || generationResult[0]) throw generationResult?.[0] ?? new Error("Missing generation result");
  if (!expiryResult || expiryResult[0]) throw expiryResult?.[0] ?? new Error("Missing generation expiry result");
  if (!globalGenerationResult || globalGenerationResult[0]) {
    throw globalGenerationResult?.[0] ?? new Error("Missing global generation result");
  }
  return combineCacheGenerations(globalGenerationResult[1] as string | null, String(generationResult[1]));
};

export type WidgetCacheGeneration = IntegrationCacheGeneration;

let widgetCacheOverflowRecoveryInFlight: Promise<boolean> | undefined;

const recoverWidgetCacheOverflowAsync = async () => {
  if (!widgetCacheOverflowGeneration) return true;
  if (widgetCacheOverflowRecoveryInFlight) return await widgetCacheOverflowRecoveryInFlight;

  const overflowGeneration = widgetCacheOverflowGeneration;
  let promise: Promise<boolean>;
  promise = (async () => {
    try {
      const generation = await advanceGlobalCacheGenerationAsync(widgetCacheGlobalGenerationKey);
      if (generation === null) return false;

      cacheGenerationReads.clear();
      cacheGenerationReadsInFlight.clear();
      if (widgetCacheOverflowGeneration !== overflowGeneration) return false;
      widgetCacheOverflowGeneration = undefined;
      return true;
    } catch (error) {
      logCacheGenerationFailure(
        "Failed to recover widget cache invalidation overflow",
        { operation: "global-generation-advance" },
        error,
      );
      return false;
    }
  })().finally(() => {
    if (widgetCacheOverflowRecoveryInFlight === promise) {
      widgetCacheOverflowRecoveryInFlight = undefined;
    }
  });
  widgetCacheOverflowRecoveryInFlight = promise;
  return await promise;
};

export const getWidgetCacheGenerationAsync = async (namespace: string): Promise<WidgetCacheGeneration> => {
  const cacheKey = widgetCacheGenerationKey(namespace);
  const pendingGeneration = pendingWidgetCacheInvalidations.get(namespace);
  if (pendingGeneration) {
    const generation = await getCachedGenerationAsync({
      cacheKey,
      readAsync: async () => await advanceWidgetCacheGenerationAsync(namespace),
      fallback: { value: pendingGeneration, isShared: false },
      errorMessage: "Failed to retry widget cache invalidation",
      errorMetadata: { cacheNamespace: namespace, operation: "generation-advance" },
    });
    if (generation.isShared && pendingWidgetCacheInvalidations.get(namespace) === pendingGeneration) {
      pendingWidgetCacheInvalidations.delete(namespace);
      return generation;
    }
    const latestPendingGeneration = pendingWidgetCacheInvalidations.get(namespace);
    if (latestPendingGeneration) return { value: latestPendingGeneration, isShared: false };
    return generation;
  }

  if (widgetCacheOverflowGeneration) {
    await recoverWidgetCacheOverflowAsync();
    if (widgetCacheOverflowGeneration) {
      return { value: widgetCacheOverflowGeneration, isShared: false };
    }
  }

  const client = boundedCacheClient;
  return await getCachedGenerationAsync({
    cacheKey,
    readAsync: async () => {
      if (!client) return null;
      const [globalGeneration, scopedGeneration] = await withCacheGenerationRedisTimeoutAsync(
        client.mget(widgetCacheGlobalGenerationKey, cacheKey),
      );
      return combineCacheGenerations(globalGeneration, scopedGeneration);
    },
    fallback: { value: "redis-unavailable", isShared: false },
    errorMessage: "Failed to read widget cache generation",
    errorMetadata: { cacheNamespace: namespace, operation: "generation-read" },
  });
};

export const invalidateWidgetCache = (namespace: string): void => {
  const pendingGeneration = `local-${createId()}`;
  const previousGeneration = pendingWidgetCacheInvalidations.get(namespace);
  const canTrackInvalidation =
    !widgetCacheOverflowGeneration &&
    (previousGeneration !== undefined || pendingWidgetCacheInvalidations.size < MAX_PENDING_WIDGET_CACHE_INVALIDATIONS);
  if (canTrackInvalidation) {
    pendingWidgetCacheInvalidations.set(namespace, pendingGeneration);
  } else if (widgetCacheOverflowGeneration) {
    widgetCacheOverflowGeneration = pendingGeneration;
  }
  const cacheKey = widgetCacheGenerationKey(namespace);
  beginCacheGenerationInvalidation(cacheKey, pendingGeneration);

  void getCachedGenerationAsync({
    cacheKey,
    readAsync: async () => await advanceWidgetCacheGenerationAsync(namespace),
    fallback: { value: pendingGeneration, isShared: false },
    errorMessage: "Failed to invalidate widget caches in Redis",
    errorMetadata: { cacheNamespace: namespace, operation: "generation-advance" },
    force: true,
  }).then((generation) => {
    if (!generation.isShared && !canTrackInvalidation) {
      widgetCacheOverflowGeneration = pendingGeneration;
    }
    if (generation.isShared && pendingWidgetCacheInvalidations.get(namespace) === pendingGeneration) {
      pendingWidgetCacheInvalidations.delete(namespace);
    }
  });
};

/**
 * @deprecated This function should no longer be used, see history-channel functions.
 */
export const createChannelEventHistoryOld = <TData>(channelName: string, maxElements = 15) => {
  const popElementsOverMaxAsync = async () => {
    const length = await requireRedisConnection(getSetClient).llen(channelName);
    if (length <= maxElements) {
      return;
    }
    await requireRedisConnection(getSetClient).ltrim(channelName, 0, maxElements - 1);
  };

  return {
    subscribe: (callback: (data: TData) => void) => {
      return ChannelSubscriptionTracker.subscribe(channelName, (message) => {
        callback(superjson.parse(message));
      });
    },
    publishAndPushAsync: async (data: TData) => {
      await requireRedisConnection(publisher).publish(channelName, superjson.stringify(data));
      await requireRedisConnection(getSetClient).lpush(
        channelName,
        superjson.stringify({ data, timestamp: new Date() }),
      );
      await popElementsOverMaxAsync();
    },
    pushAsync: async (data: TData) => {
      await requireRedisConnection(getSetClient).lpush(
        channelName,
        superjson.stringify({ data, timestamp: new Date() }),
      );
      await popElementsOverMaxAsync();
    },
    clearAsync: async () => {
      await requireRedisConnection(getSetClient).del(channelName);
    },
    getLastAsync: async () => {
      const client = requireRedisConnection(getSetClient);
      const length = await client.llen(channelName);
      const data = await client.lrange(channelName, length - 1, length);
      if (data.length !== 1) return null;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return superjson.parse<{ data: TData; timestamp: Date }>(data[0]!);
    },
    getSliceAsync: async (startIndex: number, endIndex: number) => {
      const range = await requireRedisConnection(getSetClient).lrange(channelName, startIndex, endIndex);
      return range.map((item) => superjson.parse<{ data: TData; timestamp: Date }>(item));
    },
    getSliceUntilTimeAsync: async (time: Date) => {
      const client = requireRedisConnection(getSetClient);
      const length = await client.llen(channelName);
      const items: TData[] = [];
      const itemsInCollection = await client.lrange(channelName, 0, length - 1);

      for (let i = 0; i < length - 1; i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const deserializedItem = superjson.parse<{ data: TData; timestamp: Date }>(itemsInCollection[i]!);
        if (deserializedItem.timestamp < time) {
          continue;
        }
        items.push(deserializedItem.data);
      }
      return items;
    },
    getLengthAsync: async () => {
      return await requireRedisConnection(getSetClient).llen(channelName);
    },
    name: channelName,
  };
};

const queueClient = createRedisConnection();

type WithId<TItem> = TItem & { _id: string };

/**
 * Creates a queue channel to store and manage queue executions.
 * @param name name of the queue channel
 * @returns queue channel object
 */
export const createQueueChannel = <TItem>(name: string) => {
  const queueChannelName = `queue:${name}`;
  const getDataAsync = async () => {
    const data = await requireRedisConnection(queueClient).get(queueChannelName);
    return data ? superjson.parse<WithId<TItem>[]>(data) : [];
  };
  const setDataAsync = async (data: WithId<TItem>[]) => {
    await requireRedisConnection(queueClient).set(queueChannelName, superjson.stringify(data));
  };

  return {
    /**
     * Add a new queue execution.
     * @param data data to be stored in the queue execution to run it later
     */
    addAsync: async (data: TItem) => {
      const items = await getDataAsync();
      items.push({ _id: createId(), ...data });
      await setDataAsync(items);
    },
    /**
     * Get all queue executions.
     */
    all: getDataAsync,
    /**
     * Get a queue execution by its id.
     * @param id id of the queue execution (stored under _id key)
     * @returns queue execution or undefined if not found
     */
    byIdAsync: async (id: string) => {
      const items = await getDataAsync();
      return items.find((item) => item._id === id);
    },
    /**
     * Filters the queue executions by a given filter function.
     * @param filter callback function that returns true if the item should be included in the result
     * @returns filtered queue executions
     */
    filterAsync: async (filter: (item: WithId<TItem>) => boolean) => {
      const items = await getDataAsync();
      return items.filter(filter);
    },
    /**
     * Marks an queue execution as done, by deleting it.
     * @param id id of the queue execution (stored under _id key)
     */
    markAsDoneAsync: async (id: string) => {
      const items = await getDataAsync();
      await setDataAsync(items.filter((item) => item._id !== id));
    },
  };
};

export const handshakeAsync = async () => {
  await requireRedisConnection(getSetClient).hello();
};
