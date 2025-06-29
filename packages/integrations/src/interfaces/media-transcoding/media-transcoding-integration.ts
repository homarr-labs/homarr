import type { TdarrQueue } from "./queue";
import type { TdarrStatistics } from "./statistics";
import type { TdarrWorker } from "./workers";

export interface IMediaTranscodingIntegration {
  getStatisticsAsync(): Promise<TdarrStatistics>;
  getWorkersAsync(): Promise<TdarrWorker[]>;
  getQueueAsync(firstItemIndex: number, pageSize: number): Promise<TdarrQueue>;
}
