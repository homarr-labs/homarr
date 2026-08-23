import superjson from "superjson";

import { createId } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import { ChannelSubscriptionTracker } from "./channel-subscription-tracker";
import { createRedisConnection } from "./connection";

const publisher = createRedisConnection();
const lastDataClient = createRedisConnection();
const logger = createLogger({ module: "redisChannel" });

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
        void lastDataClient.get(lastChannelName).then((data) => {
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
        await lastDataClient.set(lastChannelName, superjson.stringify(data));
      }
      await publisher.publish(channelName, superjson.stringify(data));
    },
    getLastDataAsync: async () => {
      const data = await lastDataClient.get(lastChannelName);
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
      const items = await getSetClient.lrange(listChannelName, 0, -1);
      return items.map((item) => superjson.parse<TItem>(item));
    },
    /**
     * Remove an item from the channels list by item
     * @param item item to remove
     */
    removeAsync: async (item: TItem) => {
      await getSetClient.lrem(listChannelName, 0, superjson.stringify(item));
    },
    /**
     * Clear all items from the channels list
     */
    clearAsync: async () => {
      await getSetClient.del(listChannelName);
    },
    /**
     * Add an item to the channels list
     * @param item item to add
     */
    addAsync: async (item: TItem) => {
      await getSetClient.lpush(listChannelName, superjson.stringify(item));
    },
  };
};

/**
 * Creates a new redis channel for getting and setting data
 * @param name name of channel
 */
export const createGetSetChannel = <TData>(name: string) => {
  return {
    /**
     * Get data from the channel
     * @returns data or null if not found
     */
    getAsync: async () => {
      const data = await getSetClient.get(name);
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
          await getSetClient.del(name);
          return;
        }
        await getSetClient.set(name, superjson.stringify(data), "PX", options.ttlMs);
        return;
      }
      if (options?.ttlSeconds) {
        await getSetClient.set(name, superjson.stringify(data), "EX", options.ttlSeconds);
        return;
      }
      await getSetClient.set(name, superjson.stringify(data));
    },
    /**
     * Remove data from the channel
     */
    removeAsync: async () => {
      await getSetClient.del(name);
    },
  };
};

/**
 * Creates a short-lived distributed lock.
 *
 * The token prevents a process from releasing a lock that expired and was
 * acquired by another process in the meantime.
 */
export const createLockChannel = (name: string) => {
  return {
    acquireAsync: async (ttlSeconds: number) => {
      const token = createId();
      const client = getSetClient as typeof getSetClient | null;
      if (!client) return token;

      const result = await client.set(name, token, "EX", ttlSeconds, "NX");
      return result === "OK" ? token : null;
    },
    releaseAsync: async (token: string) => {
      const client = getSetClient as typeof getSetClient | null;
      if (!client) return;

      await client.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        name,
        token,
      );
    },
  };
};

const integrationCacheGenerationKey = (integrationId: string) => `integration-cache:generation:${integrationId}`;
export const getIntegrationSessionStoreKey = (integrationId: string) => `session-store:${integrationId}`;
interface PendingIntegrationCacheInvalidation {
  generation: string;
  clearSession: boolean;
}

const pendingIntegrationCacheInvalidations = new Map<string, PendingIntegrationCacheInvalidation>();
const MAX_PENDING_INTEGRATION_CACHE_INVALIDATIONS = 1000;
const CACHE_GENERATION_REDIS_TIMEOUT_MS = 500;
const CACHE_GENERATION_SUCCESS_TTL_MS = 1000;
const CACHE_GENERATION_UNAVAILABLE_TTL_MS = 5000;
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
}

const getCachedGenerationAsync = async ({
  cacheKey,
  readAsync,
  fallback,
  errorMessage,
  errorMetadata,
  force = false,
}: GetCachedGenerationOptions): Promise<IntegrationCacheGeneration> => {
  if (!force) {
    const cached = cacheGenerationReads.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return cached.generation;
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
  const client = getSetClient as typeof getSetClient | null;
  if (!client) return null;

  const results = await withCacheGenerationRedisTimeoutAsync(
    client
      .multi()
      .incr(integrationCacheGenerationKey(integrationId))
      .del(getIntegrationSessionStoreKey(integrationId))
      .exec(),
  );
  const generationResult = results?.[0];
  const sessionResult = results?.[1];
  if (!generationResult || generationResult[0]) throw generationResult?.[0] ?? new Error("Missing generation result");
  if (!sessionResult || sessionResult[0]) throw sessionResult?.[0] ?? new Error("Missing session result");
  return String(generationResult[1]);
};

const advanceIntegrationResponseCacheGenerationAsync = async (integrationId: string) => {
  const client = getSetClient as typeof getSetClient | null;
  if (!client) return null;

  return String(await withCacheGenerationRedisTimeoutAsync(client.incr(integrationCacheGenerationKey(integrationId))));
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

  const client = getSetClient as typeof getSetClient | null;
  return await getCachedGenerationAsync({
    cacheKey,
    readAsync: async () => {
      if (!client) return null;
      return (await withCacheGenerationRedisTimeoutAsync(client.get(cacheKey))) ?? "0";
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
  if (pendingIntegrationCacheInvalidations.size >= MAX_PENDING_INTEGRATION_CACHE_INVALIDATIONS) {
    const oldestIntegrationId = pendingIntegrationCacheInvalidations.keys().next().value;
    if (oldestIntegrationId) pendingIntegrationCacheInvalidations.delete(oldestIntegrationId);
  }
  pendingIntegrationCacheInvalidations.set(integrationId, pendingInvalidation);
  const cacheKey = integrationCacheGenerationKey(integrationId);
  beginCacheGenerationInvalidation(cacheKey, pendingInvalidation.generation);
  const invalidationOperation = getIntegrationCacheInvalidationOperation(pendingInvalidation.clearSession);

  const generation = await getCachedGenerationAsync({
    cacheKey,
    readAsync: async () => await invalidationOperation.advanceAsync(integrationId),
    fallback: { value: pendingInvalidation.generation, isShared: false },
    errorMessage: invalidationOperation.failureMessage,
    errorMetadata: {
      integrationId,
      operation: invalidationOperation.operation,
    },
    force: true,
  });
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
const pendingWidgetCacheInvalidations = new Map<string, string>();
const MAX_PENDING_WIDGET_CACHE_INVALIDATIONS = 1000;

const advanceWidgetCacheGenerationAsync = async (namespace: string) => {
  const client = getSetClient as typeof getSetClient | null;
  if (!client) return null;

  return String(await withCacheGenerationRedisTimeoutAsync(client.incr(widgetCacheGenerationKey(namespace))));
};

export type WidgetCacheGeneration = IntegrationCacheGeneration;

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

  const client = getSetClient as typeof getSetClient | null;
  return await getCachedGenerationAsync({
    cacheKey,
    readAsync: async () => {
      if (!client) return null;
      return (await withCacheGenerationRedisTimeoutAsync(client.get(cacheKey))) ?? "0";
    },
    fallback: { value: "redis-unavailable", isShared: false },
    errorMessage: "Failed to read widget cache generation",
    errorMetadata: { cacheNamespace: namespace, operation: "generation-read" },
  });
};

export const invalidateWidgetCache = (namespace: string): void => {
  const pendingGeneration = `local-${createId()}`;
  if (pendingWidgetCacheInvalidations.size >= MAX_PENDING_WIDGET_CACHE_INVALIDATIONS) {
    const oldestNamespace = pendingWidgetCacheInvalidations.keys().next().value;
    if (oldestNamespace) pendingWidgetCacheInvalidations.delete(oldestNamespace);
  }
  pendingWidgetCacheInvalidations.set(namespace, pendingGeneration);
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
    const length = await getSetClient.llen(channelName);
    if (length <= maxElements) {
      return;
    }
    await getSetClient.ltrim(channelName, 0, maxElements - 1);
  };

  return {
    subscribe: (callback: (data: TData) => void) => {
      return ChannelSubscriptionTracker.subscribe(channelName, (message) => {
        callback(superjson.parse(message));
      });
    },
    publishAndPushAsync: async (data: TData) => {
      await publisher.publish(channelName, superjson.stringify(data));
      await getSetClient.lpush(channelName, superjson.stringify({ data, timestamp: new Date() }));
      await popElementsOverMaxAsync();
    },
    pushAsync: async (data: TData) => {
      await getSetClient.lpush(channelName, superjson.stringify({ data, timestamp: new Date() }));
      await popElementsOverMaxAsync();
    },
    clearAsync: async () => {
      await getSetClient.del(channelName);
    },
    getLastAsync: async () => {
      const length = await getSetClient.llen(channelName);
      const data = await getSetClient.lrange(channelName, length - 1, length);
      if (data.length !== 1) return null;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return superjson.parse<{ data: TData; timestamp: Date }>(data[0]!);
    },
    getSliceAsync: async (startIndex: number, endIndex: number) => {
      const range = await getSetClient.lrange(channelName, startIndex, endIndex);
      return range.map((item) => superjson.parse<{ data: TData; timestamp: Date }>(item));
    },
    getSliceUntilTimeAsync: async (time: Date) => {
      const length = await getSetClient.llen(channelName);
      const items: TData[] = [];
      const itemsInCollection = await getSetClient.lrange(channelName, 0, length - 1);

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
      return await getSetClient.llen(channelName);
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
    const data = await queueClient.get(queueChannelName);
    return data ? superjson.parse<WithId<TItem>[]>(data) : [];
  };
  const setDataAsync = async (data: WithId<TItem>[]) => {
    await queueClient.set(queueChannelName, superjson.stringify(data));
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
  await getSetClient.hello();
};
