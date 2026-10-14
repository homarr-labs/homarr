import type { PersistenceRuntime } from "../runtime";

export interface RuntimeHistoryStream {
  readonly kind: "log" | "sample";
  readonly name: string;
}

export interface RuntimeHistoryRegistration extends RuntimeHistoryStream {
  readonly maxEntries: number;
}

export interface RuntimeHistoryOperation {
  readonly signal: AbortSignal;
  readonly deadlineAt: number;
}

export interface RuntimeHistoryLimits {
  readonly maxStreams: number;
  readonly maxIdentityBytes: number;
  readonly maxPayloadBytes: number;
  readonly maxPendingOperations: number;
  readonly maxPendingBytes: number;
  readonly maxOperationDurationMs: number;
}

export interface RuntimeHistorySqlOptions {
  readonly runtime: PersistenceRuntime;
  readonly epoch: string;
  readonly lifetime: AbortSignal;
  readonly streams: readonly RuntimeHistoryRegistration[];
  readonly limits: RuntimeHistoryLimits;
}

export interface RuntimeHistoryAppendResult {
  readonly sequence: string;
  readonly payload: string;
}

export interface RuntimeHistorySqlStore {
  appendTrimAsync(
    stream: RuntimeHistoryStream,
    payload: string,
    maxEntries: number,
    operation: RuntimeHistoryOperation,
  ): Promise<RuntimeHistoryAppendResult>;
  readNewestAsync(
    stream: RuntimeHistoryStream,
    maxEntries: number,
    operation: RuntimeHistoryOperation,
  ): Promise<readonly string[]>;
  clearAsync(stream: RuntimeHistoryStream, operation: RuntimeHistoryOperation): Promise<void>;
}
