import superjson from "superjson";

import { createId } from "@homarr/db";
import type { WidgetKind } from "@homarr/definitions";
import { logger } from "@homarr/log";

import { createRedisConnection } from "./connection";

const subscriber = createRedisConnection(); // Used for subscribing to channels - after subscribing it can only be used for subscribing
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
      void subscriber.subscribe(channelName, (err) => {
        if (!err) {
          return;
        }
        logger.error(`Error with channel '${channelName}': ${err.name} (${err.message})`);
      });
      subscriber.on("message", (channel, message) => {
        if (channel !== channelName) return; // TODO: check if this is necessary - it should be handled by the redis client

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
     * Add an item to the channels list
     * @param item item to add
     */
    addAsync: async (item: TItem) => {
      await getSetClient.lpush(listChannelName, superjson.stringify(item));
    },
  };
};

/**
 * Creates a new cache channel.
 * @param name name of the channel
 * @param cacheDurationMs duration in milliseconds to cache
 * @returns cache channel object
 */
export const createCacheChannel = <TData>(name: string, cacheDurationMs: number = 5 * 60 * 1000) => {
  const cacheChannelName = `cache:${name}`;

  return {
    /**
     * Get the data from the cache channel.
     * @returns data or null if not found or expired
     */
    getAsync: async () => {
      const data = await getSetClient.get(cacheChannelName);
      if (!data) return null;

      const parsedData = superjson.parse<{ data: TData; timestamp: Date }>(data);
      const now = new Date();
      const diff = now.getTime() - parsedData.timestamp.getTime();
      if (diff > cacheDurationMs) return null;

      return parsedData;
    },
    /**
     * Consume the data from the cache channel, if not present or expired, it will call the callback to get new data.
     * @param callback callback function to get new data if not present or expired
     * @returns data or new data if not present or expired
     */
    consumeAsync: async (callback: () => Promise<TData>) => {
      const data = await getSetClient.get(cacheChannelName);

      const getNewDataAsync = async () => {
        logger.debug(`Cache miss for channel '${cacheChannelName}'`);
        const newData = await callback();
        const result = { data: newData, timestamp: new Date() };
        await getSetClient.set(cacheChannelName, superjson.stringify(result));
        logger.debug(`Cache updated for channel '${cacheChannelName}'`);
        return result;
      };

      if (!data) {
        return await getNewDataAsync();
      }

      const parsedData = superjson.parse<{ data: TData; timestamp: Date }>(data);
      const now = new Date();
      const diff = now.getTime() - parsedData.timestamp.getTime();

      if (diff > cacheDurationMs) {
        return await getNewDataAsync();
      }

      logger.debug(`Cache hit for channel '${cacheChannelName}'`);

      return parsedData;
    },
    /**
     * Invalidate the cache channels data.
     */
    invalidateAsync: async () => {
      await getSetClient.del(cacheChannelName);
    },
    /**
     * Set the data in the cache channel.
     * @param data data to be stored in the cache channel
     */
    setAsync: async (data: TData) => {
      await getSetClient.set(cacheChannelName, superjson.stringify({ data, timestamp: new Date() }));
    },
  };
};

export const createItemAndIntegrationChannel = <TData>(kind: WidgetKind, integrationId: string) => {
  const channelName = `item:${kind}:integration:${integrationId}`;
  return {
    subscribeAsync: async (callback: (data: TData) => void) => {
      await subscriber.subscribe(channelName);
      subscriber.on("message", (channel, message) => {
        if (channel !== channelName) {
          logger.warn(`received message on ${channel} channel but was looking for ${channelName}`);
          return;
        }
        callback(superjson.parse(message));
        logger.debug(`sent message on ${channelName}`);
      });
    },
    publishAndUpdateLastStateAsync: async (data: TData) => {
      await publisher.publish(channelName, superjson.stringify(data));
      await getSetClient.set(channelName, superjson.stringify({ data, timestamp: new Date() }));
    },
    setAsync: async (data: TData) => {
      await getSetClient.set(channelName, superjson.stringify({ data, timestamp: new Date() }));
    },
    getAsync: async () => {
      const data = await getSetClient.get(channelName);
      if (!data) return null;

      return superjson.parse<{ data: TData; timestamp: Date }>(data);
    },
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
