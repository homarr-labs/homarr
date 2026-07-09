import type { MissingMediaItem, QueuedMediaItem } from "./media-organizer-types";

export interface IMediaOrganizerIntegration {
  getMissingAsync(pageSize?: number): Promise<{ items: MissingMediaItem[]; totalCount: number }>;
  getMediaQueueAsync(pageSize?: number): Promise<{ items: QueuedMediaItem[]; totalCount: number }>;
}
