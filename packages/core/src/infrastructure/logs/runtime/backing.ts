export interface HistoryOperation {
  signal: AbortSignal;
}

export interface LogHistoryBacking {
  appendAndPublishAsync(message: string, maxEntries: number, operation: HistoryOperation): Promise<void>;
  readNewestAsync(maxEntries: number, operation: HistoryOperation): Promise<readonly string[]>;
  subscribeAsync(callback: (message: string) => void, operation: HistoryOperation): Promise<() => void>;
}

export interface SampleHistoryBacking {
  pushAsync(name: string, entry: string, maxEntries: number, operation: HistoryOperation): Promise<void>;
  readNewestAsync(name: string, maxEntries: number, operation: HistoryOperation): Promise<readonly string[]>;
  clearAsync(name: string, operation: HistoryOperation): Promise<void>;
  publishAsync(name: string, data: string, operation: HistoryOperation): Promise<void>;
  subscribeAsync(name: string, callback: (data: string) => void, operation: HistoryOperation): Promise<() => void>;
}
