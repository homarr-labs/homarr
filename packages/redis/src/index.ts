import { parse } from "superjson";

import type { LoggerMessage } from "@homarr/core/infrastructure/logs/constants";
import { LOG_HISTORY_KEY, LOG_HISTORY_MAX_ENTRIES } from "@homarr/core/infrastructure/logs/constants";

import { createListChannel, createSubPubChannel } from "./lib/channel";
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

const liveLoggingChannel = createSubPubChannel<LoggerMessage>("logging", { persist: false });
const loggingHistoryClient = createRedisConnection();

export const loggingChannel = {
  subscribe: liveLoggingChannel.subscribe,
  subscribeAsync: liveLoggingChannel.subscribeAsync,
  getRecentAsync: async () => {
    const messages = await loggingHistoryClient.lrange(LOG_HISTORY_KEY, 0, LOG_HISTORY_MAX_ENTRIES - 1);
    return messages.map((message) => parse<LoggerMessage>(message)).toReversed();
  },
};
