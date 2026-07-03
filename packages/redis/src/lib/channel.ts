import superjson from "superjson";

import { createId } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";

import { ChannelSubscriptionTracker } from "./channel-subscription-tracker";
import { createRedisConnection } from "./connection";

const logger = createLogger({ module: "redisChannel" });

const publisher = createRedisConnection();
const lastDataClient = createRedisConnection();

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
     * @param options optional TTL in seconds
     */
    setAsync: async (data: TData, options?: { ttlSeconds?: number }) => {
      await getSetClient.set(name, superjson.stringify(data));
      if (options?.ttlSeconds) {
        await getSetClient.expire(name, options.ttlSeconds);
      }
    },
    /**
     * Remove data from the channel
     */
    removeAsync: async () => {
      await getSetClient.del(name);
    },
  };
};

const queryCacheKey = (userId: string, boardId: string) => `qc:${userId}:${boardId}`;

export const setQueryCacheAsync = async (
  userId: string,
  boardId: string,
  value: string,
  ttlMs: number,
  maxValueBytes: number,
) => {
  if (Buffer.byteLength(value, "utf8") > maxValueBytes) {
    logger.warn("Query cache value exceeded maximum size", {
      key: queryCacheKey(userId, boardId),
      valueBytes: Buffer.byteLength(value, "utf8"),
      maxValueBytes,
    });
    return false;
  }
  await getSetClient.set(queryCacheKey(userId, boardId), value, "PX", ttlMs);
  return true;
};

export const getQueryCacheAsync = async (userId: string, boardId: string) =>
  await getSetClient.get(queryCacheKey(userId, boardId));

export const removeQueryCacheAsync = async (userId: string, boardId: string) => {
  await getSetClient.del(queryCacheKey(userId, boardId));
};

export const invalidateIntegrationCacheAsync = async (integrationId: string): Promise<void> => {
  const client = getSetClient as typeof getSetClient | null;
  if (!client) return;
  await client.del(`session-store:${integrationId}`);
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
