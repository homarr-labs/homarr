import { createQueueChannel, createSubPubChannel } from "./lib/channel";

export const exampleChannel = createSubPubChannel<{ message: string }>(
  "example",
);
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
