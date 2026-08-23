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
const pendingIntegrationCacheInvalidations = new Map<string, string>();
const MAX_PENDING_INTEGRATION_CACHE_INVALIDATIONS = 1000;
const INTEGRATION_CACHE_REDIS_TIMEOUT_MS = 500;

const logCacheGenerationFailure = (message: string, metadata: Record<string, unknown>, error: unknown) => {
  logger.warn(new ErrorWithMetadata(message, metadata, { cause: error }));
};

const withIntegrationCacheRedisTimeoutAsync = async <T>(promise: Promise<T>): Promise<T> => {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Redis integration cache operation timed out")),
      INTEGRATION_CACHE_REDIS_TIMEOUT_MS,
    );
    timer.unref?.();
    void promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
};

const advanceIntegrationCacheGenerationAsync = async (integrationId: string) => {
  const client = getSetClient as typeof getSetClient | null;
  if (!client) return null;

  const results = await withIntegrationCacheRedisTimeoutAsync(
    client.multi().incr(integrationCacheGenerationKey(integrationId)).del(`session-store:${integrationId}`).exec(),
  );
  const generationResult = results?.[0];
  const sessionResult = results?.[1];
  if (!generationResult || generationResult[0]) throw generationResult?.[0] ?? new Error("Missing generation result");
  if (!sessionResult || sessionResult[0]) throw sessionResult?.[0] ?? new Error("Missing session result");
  return String(generationResult[1]);
};

export interface IntegrationCacheGeneration {
  value: string;
  isShared: boolean;
}

export const getIntegrationCacheGenerationAsync = async (
  integrationId: string,
): Promise<IntegrationCacheGeneration> => {
  const pendingGeneration = pendingIntegrationCacheInvalidations.get(integrationId);
  if (pendingGeneration) {
    try {
      const generation = await advanceIntegrationCacheGenerationAsync(integrationId);
      if (generation) {
        if (pendingIntegrationCacheInvalidations.get(integrationId) === pendingGeneration) {
          pendingIntegrationCacheInvalidations.delete(integrationId);
          return { value: generation, isShared: true };
        }
        return {
          value: pendingIntegrationCacheInvalidations.get(integrationId) ?? generation,
          isShared: false,
        };
      }
    } catch (error) {
      logCacheGenerationFailure(
        "Failed to retry integration cache invalidation",
        { integrationId, operation: "generation-advance" },
        error,
      );
    }
    return { value: pendingGeneration, isShared: false };
  }

  const client = getSetClient as typeof getSetClient | null;
  if (!client) return { value: "redis-unavailable", isShared: false };

  try {
    const generation = await withIntegrationCacheRedisTimeoutAsync(
      client.get(integrationCacheGenerationKey(integrationId)),
    );
    return { value: generation ?? "0", isShared: true };
  } catch (error) {
    logCacheGenerationFailure(
      "Failed to read integration cache generation",
      { integrationId, operation: "generation-read" },
      error,
    );
    return { value: "redis-unavailable", isShared: false };
  }
};

export const invalidateIntegrationCacheAsync = async (integrationId: string): Promise<void> => {
  const pendingGeneration = `local-${createId()}`;
  if (pendingIntegrationCacheInvalidations.size >= MAX_PENDING_INTEGRATION_CACHE_INVALIDATIONS) {
    const oldestIntegrationId = pendingIntegrationCacheInvalidations.keys().next().value;
    if (oldestIntegrationId) pendingIntegrationCacheInvalidations.delete(oldestIntegrationId);
  }
  pendingIntegrationCacheInvalidations.set(integrationId, pendingGeneration);

  try {
    const generation = await advanceIntegrationCacheGenerationAsync(integrationId);
    if (generation && pendingIntegrationCacheInvalidations.get(integrationId) === pendingGeneration) {
      pendingIntegrationCacheInvalidations.delete(integrationId);
    }
  } catch (error) {
    logCacheGenerationFailure(
      "Failed to invalidate integration caches in Redis",
      { integrationId, operation: "generation-advance-and-session-delete" },
      error,
    );
  }
};

const widgetCacheGenerationKey = (namespace: string) => `widget-cache:generation:${namespace}`;
const pendingWidgetCacheInvalidations = new Map<string, string>();
const MAX_PENDING_WIDGET_CACHE_INVALIDATIONS = 1000;

const advanceWidgetCacheGenerationAsync = async (namespace: string) => {
  const client = getSetClient as typeof getSetClient | null;
  if (!client) return null;

  return String(await withIntegrationCacheRedisTimeoutAsync(client.incr(widgetCacheGenerationKey(namespace))));
};

export type WidgetCacheGeneration = IntegrationCacheGeneration;

export const getWidgetCacheGenerationAsync = async (namespace: string): Promise<WidgetCacheGeneration> => {
  const pendingGeneration = pendingWidgetCacheInvalidations.get(namespace);
  if (pendingGeneration) {
    try {
      const generation = await advanceWidgetCacheGenerationAsync(namespace);
      if (generation) {
        if (pendingWidgetCacheInvalidations.get(namespace) === pendingGeneration) {
          pendingWidgetCacheInvalidations.delete(namespace);
          return { value: generation, isShared: true };
        }
        return {
          value: pendingWidgetCacheInvalidations.get(namespace) ?? generation,
          isShared: false,
        };
      }
    } catch (error) {
      logCacheGenerationFailure(
        "Failed to retry widget cache invalidation",
        { cacheNamespace: namespace, operation: "generation-advance" },
        error,
      );
    }
    return { value: pendingGeneration, isShared: false };
  }

  const client = getSetClient as typeof getSetClient | null;
  if (!client) return { value: "redis-unavailable", isShared: false };

  try {
    const generation = await withIntegrationCacheRedisTimeoutAsync(client.get(widgetCacheGenerationKey(namespace)));
    return { value: generation ?? "0", isShared: true };
  } catch (error) {
    logCacheGenerationFailure(
      "Failed to read widget cache generation",
      { cacheNamespace: namespace, operation: "generation-read" },
      error,
    );
    return { value: "redis-unavailable", isShared: false };
  }
};

export const invalidateWidgetCache = (namespace: string): void => {
  const pendingGeneration = `local-${createId()}`;
  if (pendingWidgetCacheInvalidations.size >= MAX_PENDING_WIDGET_CACHE_INVALIDATIONS) {
    const oldestNamespace = pendingWidgetCacheInvalidations.keys().next().value;
    if (oldestNamespace) pendingWidgetCacheInvalidations.delete(oldestNamespace);
  }
  pendingWidgetCacheInvalidations.set(namespace, pendingGeneration);

  void advanceWidgetCacheGenerationAsync(namespace)
    .then((generation) => {
      if (generation && pendingWidgetCacheInvalidations.get(namespace) === pendingGeneration) {
        pendingWidgetCacheInvalidations.delete(namespace);
      }
    })
    .catch((error: unknown) => {
      logCacheGenerationFailure(
        "Failed to invalidate widget caches in Redis",
        { cacheNamespace: namespace, operation: "generation-advance" },
        error,
      );
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
