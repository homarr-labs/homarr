import superjson from "superjson";

import { createId } from "@homarr/db";
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
export const createSubPubChannel = <TData>(name: string) => {
  const lastChannelName = `pubSub:last:${name}`;
  const channelName = `pubSub:${name}`;
  return {
    /**
     * Subscribes to the channel and calls the callback with the last data saved - when present.
     * @param callback callback function to be called when new data is published
     */
    subscribe: (callback: (data: TData) => void) => {
      void lastDataClient.get(lastChannelName).then((data) => {
        if (data) {
          callback(superjson.parse(data));
        }
      });
      void subscriber.subscribe(channelName, (err) => {
        if (!err) {
          return;
        }
        logger.error(
          `Error with channel '${channelName}': ${err.name} (${err.message})`,
        );
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
    publish: async (data: TData) => {
      await lastDataClient.set(lastChannelName, superjson.stringify(data));
      await publisher.publish(channelName, superjson.stringify(data));
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
  const getData = async () => {
    const data = await queueClient.get(queueChannelName);
    return data ? superjson.parse<WithId<TItem>[]>(data) : [];
  };
  const setData = async (data: WithId<TItem>[]) => {
    await queueClient.set(queueChannelName, superjson.stringify(data));
  };

  return {
    /**
     * Add a new queue execution.
     * @param data data to be stored in the queue execution to run it later
     */
    add: async (data: TItem) => {
      const items = await getData();
      items.push({ _id: createId(), ...data });
      await setData(items);
    },
    /**
     * Get all queue executions.
     */
    all: getData,
    /**
     * Get a queue execution by its id.
     * @param id id of the queue execution (stored under _id key)
     * @returns queue execution or undefined if not found
     */
    byId: async (id: string) => {
      const items = await getData();
      return items.find((item) => item._id === id);
    },
    /**
     * Filters the queue executions by a given filter function.
     * @param filter callback function that returns true if the item should be included in the result
     * @returns filtered queue executions
     */
    filter: async (filter: (item: WithId<TItem>) => boolean) => {
      const items = await getData();
      return items.filter(filter);
    },
    /**
     * Marks an queue execution as done, by deleting it.
     * @param id id of the queue execution (stored under _id key)
     */
    markAsDone: async (id: string) => {
      const items = await getData();
      await setData(items.filter((item) => item._id !== id));
    },
  };
};
