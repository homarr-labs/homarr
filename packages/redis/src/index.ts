import type { LogLevel } from "@homarr/core/infrastructure/logs/constants";

import { createCacheChannel, createListChannel, createQueueChannel, createSubPubChannel } from "./lib/channel";

export {
  createCacheChannel,
  createItemAndIntegrationChannel,
  createItemChannel,
  createIntegrationOptionsChannel,
  createWidgetOptionsChannel,
  createChannelWithLatestAndEvents,
  createChannelEventHistory,
  handshakeAsync,
  createSubPubChannel,
  createGetSetChannel,
} from "./lib/channel";

export { createIntegrationHistoryChannel } from "./lib/channels/history-channel";

export const exampleChannel = createSubPubChannel<{ message: string }>("example");
export const pingChannel = createSubPubChannel<
  { url: string; statusCode: number; durationMs: number } | { url: string; error: string }
>("ping");
export const pingUrlChannel = createListChannel<string>("ping-url");

export const homeAssistantEntityState = createSubPubChannel<{
  entityId: string;
  state: string;
}>("home-assistant/entity-state");

export const queueChannel = createQueueChannel<{
  name: string;
  executionDate: Date;
  data: unknown;
}>("common-queue");

export interface LoggerMessage {
  message: string;
  level: LogLevel;
}

export const loggingChannel = createSubPubChannel<LoggerMessage>("logging");

/**
 * POC: Redis cache for widget prefetch data.
 * Caches serialized query data per widget kind to avoid database queries on every page load.
 * Default TTL: 5 minutes (matches existing cron job intervals).
 *
 * Usage: see packages/widgets/src/prefetch.ts
 * This can be reverted by reverting this commit.
 */
export const createWidgetPrefetchCache = (widgetKind: string) =>
  createCacheChannel<Record<string, unknown>>(`widget-prefetch:${widgetKind}`, 5 * 60 * 1000);
