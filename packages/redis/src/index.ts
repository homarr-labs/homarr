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
  level: string;
  timestamp: string;
}

export const loggingChannel = createSubPubChannel<LoggerMessage>("logging");
