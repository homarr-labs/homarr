export interface UsenetQueueItem {
  name: string;
  progress: number;
  sizeInBytes: number;
  id: string;
  state: 'paused' | 'downloading' | 'queued';
  estimatedTimeOfArrival: number;
}