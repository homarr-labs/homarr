import type { MaybePromise } from "@homarr/common/types";

import { createRedisConnection, requireRedisConnection } from "./connection";

const client = createRedisConnection();

/** The state transport owns subscription deduplication, bounded retention, and cleanup. */
export const ChannelSubscriptionTracker = {
  subscribe(channel: string, callback: (message: string) => MaybePromise<void>) {
    const subscription = requireRedisConnection(client).subscribeChannel(channel, callback);
    void subscription.ready.catch(() => subscription.unsubscribe());
    return subscription.unsubscribe;
  },

  async subscribeAsync(channel: string, callback: (message: string) => MaybePromise<void>) {
    const subscription = requireRedisConnection(client).subscribeChannel(channel, callback);
    try {
      await subscription.ready;
      return subscription.unsubscribe;
    } catch (error) {
      subscription.unsubscribe();
      throw error;
    }
  },
};
