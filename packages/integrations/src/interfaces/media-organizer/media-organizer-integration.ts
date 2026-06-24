import type { MissingMediaItem, QueuedMediaItem } from "./media-organizer-types";

export interface IMediaOrganizerIntegration {
  getMissingAsync(pageSize?: number): Promise<{ items: MissingMediaItem[]; totalCount: number }>;
  getQueueAsync(): Promise<{ items: QueuedMediaItem[]; totalCount: number }>;
}
