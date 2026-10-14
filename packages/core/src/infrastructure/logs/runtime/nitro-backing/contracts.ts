export interface HistorySqlStream {
  readonly kind: "log" | "sample";
  readonly name: string;
}

export interface HistorySqlOperation {
  readonly signal: AbortSignal;
  readonly lifetime: AbortSignal;
  readonly deadlineAt: number;
}

export interface HistorySqlStore {
  appendTrimAsync(
    stream: HistorySqlStream,
    payload: string,
    maxEntries: number,
    operation: HistorySqlOperation,
  ): Promise<{ sequence: string; payload: string }>;
  readNewestAsync(
    stream: HistorySqlStream,
    maxEntries: number,
    operation: HistorySqlOperation,
  ): Promise<readonly string[]>;
  clearAsync(stream: HistorySqlStream, operation: HistorySqlOperation): Promise<void>;
}

export interface SampleHistoryRegistration {
  readonly name: string;
  readonly maxEntries: 15 | 100;
}

export interface HistoryBackingLimits {
  readonly maxStreams: number;
  readonly maxStreamNameBytes: number;
  readonly maxPayloadBytes: number;
  readonly maxSnapshotBytes: number;
  readonly maxPendingOperations: number;
  readonly maxPendingOperationsPerStream: number;
  readonly maxQueuedBytes: number;
  readonly maxQueuedBytesPerStream: number;
  readonly maxListeners: number;
  readonly maxListenersPerStream: number;
  readonly operationTimeoutMs: number;
}

export interface HistoryBackingUsage {
  readonly pendingOperations: number;
  readonly queuedBytes: number;
  readonly listeners: number;
  readonly listenerFailures: number;
}

export type HistoryBackingStatus = HistoryBackingUsage &
  (
    | { readonly phase: "ready" }
    | { readonly phase: "failed"; readonly reason: unknown }
    | { readonly phase: "closing" }
    | { readonly phase: "closed" }
  );

export class HistoryAdmissionError extends Error {
  constructor() {
    super("History backing admission limit exceeded");
    this.name = "HistoryAdmissionError";
  }
}

export class HistoryDeadlineError extends Error {
  constructor() {
    super("History backing operation deadline exceeded");
    this.name = "HistoryDeadlineError";
  }
}

export class HistoryBackingClosedError extends Error {
  constructor() {
    super("History backing is closed");
    this.name = "HistoryBackingClosedError";
  }
}
