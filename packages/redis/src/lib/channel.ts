import superjson from "superjson";

import { createId } from "@homarr/common";

import { ChannelSubscriptionTracker } from "./channel-subscription-tracker";
import { getDataClient, usesMemoryFallback } from "./connection";
import { memoryGetLast, memoryPublish } from "./memory-channel";

const LAST_DATA_TTL_SECONDS = 86_400;

const dataClient = getDataClient();

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
        if (usesMemoryFallback()) {
          const data = memoryGetLast(lastChannelName);
          if (data) {
            callback(superjson.parse(data));
          }
        } else if (dataClient) {
          void dataClient.get(lastChannelName).then((data) => {
            if (data) {
              callback(superjson.parse(data));
            }
          });
        }
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
      const serialized = superjson.stringify(data);
      if (persist) {
        if (usesMemoryFallback()) {
          memoryPublish(lastChannelName, data);
        } else if (dataClient) {
          await dataClient.set(lastChannelName, serialized, "EX", LAST_DATA_TTL_SECONDS);
        }
      }
      if (usesMemoryFallback()) {
        memoryPublish(channelName, data);
      } else if (dataClient) {
        await dataClient.publish(channelName, serialized);
      }
    },
    getLastDataAsync: async () => {
      if (usesMemoryFallback()) {
        const data = memoryGetLast(lastChannelName);
        return data ? superjson.parse<TData>(data) : null;
      }
      const data = await dataClient?.get(lastChannelName);
      return data ? superjson.parse<TData>(data) : null;
    },
  };
};

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
      if (!dataClient) return [];
      const items = await dataClient.lrange(listChannelName, 0, -1);
      return items.map((item) => superjson.parse<TItem>(item));
    },
    /**
     * Remove an item from the channels list by item
     * @param item item to remove
     */
    removeAsync: async (item: TItem) => {
      if (!dataClient) return;
      await dataClient.lrem(listChannelName, 0, superjson.stringify(item));
    },
    /**
     * Clear all items from the channels list
     */
    clearAsync: async () => {
      if (!dataClient) return;
      await dataClient.del(listChannelName);
    },
    /**
     * Add an item to the channels list
     * @param item item to add
     */
    addAsync: async (item: TItem) => {
      if (!dataClient) return;
      await dataClient.lpush(listChannelName, superjson.stringify(item));
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
      if (!dataClient) return null;
      const data = await dataClient.get(name);
      return data ? superjson.parse<TData>(data) : null;
    },
    /**
     * Set data in the channel
     * @param data data to be stored in the channel
     * @param options optional TTL in seconds
     */
    setAsync: async (data: TData, options?: { ttlSeconds?: number }) => {
      if (!dataClient) return;
      if (options?.ttlSeconds) {
        await dataClient.set(name, superjson.stringify(data), "EX", options.ttlSeconds);
        return;
      }
      await dataClient.set(name, superjson.stringify(data));
    },
    /**
     * Remove data from the channel
     */
    removeAsync: async () => {
      if (!dataClient) return;
      await dataClient.del(name);
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
      if (!dataClient) return token;

      const result = await dataClient.set(name, token, "EX", ttlSeconds, "NX");
      return result === "OK" ? token : null;
    },
    releaseAsync: async (token: string) => {
      if (!dataClient) return;

      await dataClient.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        name,
        token,
      );
    },
  };
};

export const invalidateIntegrationCacheAsync = async (integrationId: string): Promise<void> => {
  if (!dataClient) return;
  await dataClient.del(`session-store:${integrationId}`);
};

/**
 * @deprecated This function should no longer be used, see history-channel functions.
 */
export const createChannelEventHistoryOld = <TData>(channelName: string, maxElements = 15) => {
  const popElementsOverMaxAsync = async () => {
    if (!dataClient) return;
    const length = await dataClient.llen(channelName);
    if (length <= maxElements) {
      return;
    }
    await dataClient.ltrim(channelName, 0, maxElements - 1);
  };

  return {
    subscribe: (callback: (data: TData) => void) => {
      return ChannelSubscriptionTracker.subscribe(channelName, (message) => {
        callback(superjson.parse(message));
      });
    },
    publishAndPushAsync: async (data: TData) => {
      if (!dataClient) return;
      await dataClient.publish(channelName, superjson.stringify(data));
      await dataClient.lpush(channelName, superjson.stringify({ data, timestamp: new Date() }));
      await popElementsOverMaxAsync();
    },
    pushAsync: async (data: TData) => {
      if (!dataClient) return;
      await dataClient.lpush(channelName, superjson.stringify({ data, timestamp: new Date() }));
      await popElementsOverMaxAsync();
    },
    clearAsync: async () => {
      if (!dataClient) return;
      await dataClient.del(channelName);
    },
    getLastAsync: async () => {
      if (!dataClient) return null;
      const length = await dataClient.llen(channelName);
      const data = await dataClient.lrange(channelName, length - 1, length);
      if (data.length !== 1) return null;

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return superjson.parse<{ data: TData; timestamp: Date }>(data[0]!);
    },
    getSliceAsync: async (startIndex: number, endIndex: number) => {
      if (!dataClient) return [];
      const range = await dataClient.lrange(channelName, startIndex, endIndex);
      return range.map((item) => superjson.parse<{ data: TData; timestamp: Date }>(item));
    },
    getSliceUntilTimeAsync: async (time: Date) => {
      if (!dataClient) return [];
      const length = await dataClient.llen(channelName);
      const items: TData[] = [];
      const itemsInCollection = await dataClient.lrange(channelName, 0, length - 1);

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
      if (!dataClient) return 0;
      return await dataClient.llen(channelName);
    },
    name: channelName,
  };
};

type WithId<TItem> = TItem & { _id: string };

/**
 * Creates a queue channel to store and manage queue executions.
 * @param name name of the queue channel
 * @returns queue channel object
 */
export const createQueueChannel = <TItem>(name: string) => {
  const queueChannelName = `queue:${name}`;
  const getDataAsync = async () => {
    if (!dataClient) return [];
    const data = await dataClient.get(queueChannelName);
    return data ? superjson.parse<WithId<TItem>[]>(data) : [];
  };
  const setDataAsync = async (data: WithId<TItem>[]) => {
    if (!dataClient) return;
    await dataClient.set(queueChannelName, superjson.stringify(data));
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
  if (!dataClient) return;
  await dataClient.hello();
};
