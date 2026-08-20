import { parse } from "superjson";

import type { LoggerMessage } from "@homarr/core/infrastructure/logs/constants";
import {
  loggerMessageSchema,
  LOG_HISTORY_KEY,
  LOG_HISTORY_MAX_ENTRIES,
  LOG_PUBLISH_CHANNEL,
} from "@homarr/core/infrastructure/logs/constants";

import { createListChannel, createSubPubChannel } from "./lib/channel";
import { ChannelSubscriptionTracker } from "./lib/channel-subscription-tracker";
import { createRedisConnection } from "./lib/connection";

export {
  handshakeAsync,
  createSubPubChannel,
  createGetSetChannel,
  createLockChannel,
  invalidateIntegrationCacheAsync,
} from "./lib/channel";

export const pingChannel = createSubPubChannel<
  { url: string; statusCode: number; durationMs: number } | { url: string; error: string }
>("ping");
export const pingUrlChannel = createListChannel<string>("ping-url");

export type { LoggerMessage } from "@homarr/core/infrastructure/logs/constants";

const loggingHistoryClient = createRedisConnection();

const parseLoggerMessage = (message: string): LoggerMessage | null => {
  try {
    const result = loggerMessageSchema.safeParse(parse<unknown>(message));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

export const loggingChannel = {
  subscribeAsync: (callback: (message: LoggerMessage) => void) =>
    ChannelSubscriptionTracker.subscribeAsync(LOG_PUBLISH_CHANNEL, (message) => {
      const parsedMessage = parseLoggerMessage(message);
      if (parsedMessage) callback(parsedMessage);
    }),
  getRecentAsync: async () => {
    const messages =
      (await loggingHistoryClient?.lrange(LOG_HISTORY_KEY, 0, LOG_HISTORY_MAX_ENTRIES - 1).catch(() => [])) ?? [];
    return messages
      .map(parseLoggerMessage)
      .filter((message): message is LoggerMessage => message !== null)
      .toReversed();
  },
};
