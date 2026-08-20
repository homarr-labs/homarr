import { randomUUID } from "crypto";

import type { MaybePromise } from "@homarr/common/types";
import { createLogger } from "@homarr/core/infrastructure/logs";

import { createRedisConnection } from "./connection";

const logger = createLogger({ module: "channelSubscriptionTracker" });

type SubscriptionCallback = (message: string) => MaybePromise<void>;

/**
 * This class is used to deduplicate redis subscriptions.
 * It keeps track of all subscriptions and only subscribes to a channel if there are any subscriptions to it.
 * It also provides a way to remove the callback from the channel.
 * It fixes a potential memory leak where the redis client would keep creating new subscriptions to the same channel.
 * @see https://github.com/homarr-labs/homarr/issues/744
 */
export class ChannelSubscriptionTracker {
  private static subscriptions = new Map<string, Map<string, SubscriptionCallback>>();
  private static subscriptionReadiness = new Map<string, Promise<void>>();
  private static redis = createRedisConnection();
  private static listenerActive = false;

  /**
   * Subscribes to a channel.
   * @param channelName name of the channel
   * @param callback callback function to be called when a message is received
   * @returns a function to unsubscribe from the channel
   */
  public static subscribe(channelName: string, callback: SubscriptionCallback) {
    return this.registerSubscription(channelName, callback).unsubscribe;
  }

  /**
   * Subscribes to a channel and resolves once Redis confirms the subscription.
   */
  public static async subscribeAsync(channelName: string, callback: SubscriptionCallback) {
    const subscription = this.registerSubscription(channelName, callback);

    try {
      await subscription.ready;
      return subscription.unsubscribe;
    } catch (error) {
      subscription.unsubscribe();
      throw error;
    }
  }

  private static registerSubscription(channelName: string, callback: SubscriptionCallback) {
    logger.debug("Adding redis channel callback", { channel: channelName });

    // We only want to activate the listener once
    if (!this.listenerActive) {
      this.activateListener();
      this.listenerActive = true;
    }

    const channelSubscriptions = this.subscriptions.get(channelName) ?? new Map<string, SubscriptionCallback>();
    const id = randomUUID();
    let ready = this.subscriptionReadiness.get(channelName);

    // Subscribe when this channel has no active or pending Redis subscription.
    if (!ready) {
      logger.debug("Subscribing to redis channel", { channel: channelName });
      ready = this.redis.subscribe(channelName).then(() => undefined);
      this.subscriptionReadiness.set(channelName, ready);
      void ready.catch(() => {
        if (this.subscriptionReadiness.get(channelName) === ready) {
          this.subscriptionReadiness.delete(channelName);
        }
      });
    }

    logger.debug("Adding redis channel callback", { channel: channelName, id });
    channelSubscriptions.set(id, callback);

    this.subscriptions.set(channelName, channelSubscriptions);

    const unsubscribe = () => {
      logger.debug("Removing redis channel callback", { channel: channelName, id });

      const currentSubscriptions = this.subscriptions.get(channelName);
      if (!currentSubscriptions) return;

      currentSubscriptions.delete(id);

      // If there are no subscriptions to the channel, unsubscribe from it
      if (currentSubscriptions.size >= 1) {
        return;
      }

      logger.debug("Unsubscribing from redis channel", { channel: channelName });
      void this.redis.unsubscribe(channelName);
      this.subscriptions.delete(channelName);
      this.subscriptionReadiness.delete(channelName);
    };

    return { ready, unsubscribe };
  }

  /**
   * Activates the listener for the redis client.
   */
  private static activateListener() {
    logger.debug("Activating listener");
    this.redis.on("message", (channel, message) => {
      const channelSubscriptions = this.subscriptions.get(channel);
      if (!channelSubscriptions) {
        logger.warn("Received message on unknown channel", { channel });
        return;
      }

      for (const [id, callback] of channelSubscriptions.entries()) {
        // Don't log messages from the logging channel as it would create an infinite loop
        if (channel !== "pubSub:logging") {
          logger.debug("Calling subscription callback", { channel, id });
        }
        void callback(message);
      }
    });
  }
}
