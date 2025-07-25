import type { LogLevel } from "@homarr/log/constants";

import { createListChannel, createQueueChannel, createSubPubChannel } from "./lib/channel";

export {
  createCacheChannel,
  createItemAndIntegrationChannel,
  createItemChannel,
  createIntegrationOptionsChannel,
  createWidgetOptionsChannel,
  createChannelWithLatestAndEvents,
  handshakeAsync,
  createSubPubChannel,
  createGetSetChannel,
} from "./lib/channel";

export const exampleChannel = createSubPubChannel<{ message: string }>("example");
export const pingChannel = createSubPubChannel<{ url: string; statusCode: number } | { url: string; error: string }>(
  "ping",
);
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
