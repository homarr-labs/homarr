import type { LogLevel } from "@homarr/core/infrastructure/logs/constants";

import { createListChannel, createSubPubChannel } from "./lib/channel";

export {
  handshakeAsync,
  createSubPubChannel,
  createGetSetChannel,
  setQueryCacheAsync,
  getQueryCacheAsync,
  removeQueryCacheAsync,
  invalidateIntegrationCacheAsync,
} from "./lib/channel";

export const pingChannel = createSubPubChannel<
  { url: string; statusCode: number; durationMs: number } | { url: string; error: string }
>("ping");
export const pingUrlChannel = createListChannel<string>("ping-url");

export interface LoggerMessage {
  message: string;
  level: LogLevel;
}

export const loggingChannel = createSubPubChannel<LoggerMessage>("logging");
