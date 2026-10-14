import { Buffer } from "node:buffer";

import type { HistoryBackingLimits, HistoryBackingStatus, HistorySqlOperation, HistorySqlStream } from "./contracts";
import { HistoryAdmissionError, HistoryBackingClosedError, HistoryDeadlineError } from "./contracts";

interface PendingOperation {
  readonly bytes: number;
  state: "queued" | "active" | "settled";
  executeAsync(): Promise<void>;
  cancel(reason: unknown): void;
  cleanup(): void;
}

interface Listener {
  readonly signal: AbortSignal;
  readonly callback: (payload: string) => void;
  release(): void;
}

export interface RegisteredHistoryStream {
  readonly identity: HistorySqlStream;
  readonly maxEntries: number;
  readonly pending: PendingOperation[];
  readonly listeners: Set<Listener>;
  pendingOperations: number;
  queuedBytes: number;
  draining: boolean;
  lastSequence: bigint;
}

export class HistoryOperationQueue {
  readonly signal: AbortSignal;
  private readonly controller = new AbortController();
  private readonly streams = new Set<RegisteredHistoryStream>();
  private readonly limits: HistoryBackingLimits;
  private phase: "ready" | "failed" | "closing" | "closed" = "ready";
  private failure: unknown;
  private pendingOperations = 0;
  private queuedBytes = 0;
  private listenerCount = 0;
  private listenerFailures = 0;
  private closePromise: Promise<void> | undefined;
  private resolveClose: (() => void) | undefined;
  private rejectClose: ((reason: unknown) => void) | undefined;
  private readonly onLifetimeAbort: () => void;

  constructor(lifetime: AbortSignal, limits: HistoryBackingLimits) {
    this.limits = Object.freeze({ ...limits });
    for (const limit of [
      this.limits.maxStreams,
      this.limits.maxStreamNameBytes,
      this.limits.maxPayloadBytes,
      this.limits.maxSnapshotBytes,
      this.limits.maxPendingOperations,
      this.limits.maxPendingOperationsPerStream,
      this.limits.maxQueuedBytes,
      this.limits.maxQueuedBytesPerStream,
      this.limits.maxListeners,
      this.limits.maxListenersPerStream,
      this.limits.operationTimeoutMs,
    ]) {
      if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError("Invalid history backing limit");
    }
    if (this.limits.operationTimeoutMs > 2_147_483_647) throw new RangeError("Invalid history operation timeout");
    if (
      this.limits.maxPendingOperationsPerStream > this.limits.maxPendingOperations ||
      this.limits.maxQueuedBytesPerStream > this.limits.maxQueuedBytes ||
      this.limits.maxListenersPerStream > this.limits.maxListeners ||
      this.limits.maxPayloadBytes > this.limits.maxQueuedBytesPerStream ||
      this.limits.maxSnapshotBytes > this.limits.maxQueuedBytesPerStream
    ) {
      throw new RangeError("Inconsistent history backing limits");
    }
    this.signal = AbortSignal.any([lifetime, this.controller.signal]);
    this.onLifetimeAbort = () => {
      if (this.phase === "ready") void this.closeAsync().catch(() => undefined);
    };
    this.signal.addEventListener("abort", this.onLifetimeAbort, { once: true });
    if (this.signal.aborted) this.onLifetimeAbort();
  }

  register(identity: HistorySqlStream, maxEntries: number): RegisteredHistoryStream {
    this.requireReady();
    if (this.streams.size >= this.limits.maxStreams) throw new HistoryAdmissionError();
    if (identity.name.length === 0 || this.bytes(identity.name, this.limits.maxStreamNameBytes) === 0) {
      throw new TypeError("Invalid history stream name");
    }
    const stream: RegisteredHistoryStream = {
      identity: Object.freeze({ ...identity }),
      maxEntries,
      pending: [],
      listeners: new Set(),
      pendingOperations: 0,
      queuedBytes: 0,
      draining: false,
      lastSequence: 0n,
    };
    this.streams.add(stream);
    return stream;
  }

  payloadBytes(payload: string): number {
    return this.bytes(payload, this.limits.maxPayloadBytes);
  }

  snapshotReservationBytes(): number {
    return this.limits.maxSnapshotBytes;
  }

  snapshot(entries: readonly string[], maxEntries: number): readonly string[] {
    if (entries.length > maxEntries) throw new RangeError("History store exceeded its entry bound");
    let bytes = 0;
    const detached: string[] = [];
    for (const entry of entries) {
      bytes += this.payloadBytes(entry);
      if (bytes > this.limits.maxSnapshotBytes) throw new HistoryAdmissionError();
      detached.push(entry);
    }
    return detached;
  }

  runAsync<T>(
    stream: RegisteredHistoryStream,
    bytes: number,
    requestSignal: AbortSignal,
    executeAsync: (operation: HistorySqlOperation) => Promise<T>,
  ): Promise<T> {
    this.requireReady();
    requestSignal.throwIfAborted();
    if (
      this.pendingOperations >= this.limits.maxPendingOperations ||
      stream.pendingOperations >= this.limits.maxPendingOperationsPerStream ||
      bytes > this.limits.maxQueuedBytes - this.queuedBytes ||
      bytes > this.limits.maxQueuedBytesPerStream - stream.queuedBytes
    ) {
      throw new HistoryAdmissionError();
    }
    const deadlineAt = Date.now() + this.limits.operationTimeoutMs;
    if (!Number.isSafeInteger(deadlineAt)) throw new RangeError("Invalid history operation deadline");
    const startedAt = performance.now();
    const deadline = new AbortController();
    const signal = AbortSignal.any([requestSignal, this.signal, deadline.signal]);
    const { promise, resolve, reject } = Promise.withResolvers<T>();
    const timer = setTimeout(() => deadline.abort(new HistoryDeadlineError()), this.limits.operationTimeoutMs);
    const check = () => {
      if (Date.now() >= deadlineAt || performance.now() - startedAt >= this.limits.operationTimeoutMs) {
        deadline.abort(new HistoryDeadlineError());
      }
      signal.throwIfAborted();
    };
    const task: PendingOperation = {
      bytes,
      state: "queued",
      executeAsync: async () => {
        try {
          check();
          const result = await executeAsync({ signal, lifetime: this.signal, deadlineAt });
          check();
          resolve(result);
        } catch (error) {
          reject(error);
          if (!signal.aborted || error !== signal.reason) this.fail(error);
          this.cancelWaiting(stream, error);
        }
      },
      cancel: (reason) => {
        if (task.state !== "queued") return;
        const index = stream.pending.indexOf(task);
        if (index !== -1) stream.pending.splice(index, 1);
        reject(reason);
        task.cleanup();
      },
      cleanup: () => {
        if (task.state === "settled") return;
        task.state = "settled";
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        this.pendingOperations--;
        this.queuedBytes -= bytes;
        stream.pendingOperations--;
        stream.queuedBytes -= bytes;
        this.finishClose();
      },
    };
    const onAbort = () => task.cancel(signal.reason);
    this.pendingOperations++;
    this.queuedBytes += bytes;
    stream.pendingOperations++;
    stream.queuedBytes += bytes;
    stream.pending.push(task);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) task.cancel(signal.reason);
    void this.drainStreamAsync(stream);
    return promise;
  }

  subscribe(stream: RegisteredHistoryStream, callback: (payload: string) => void, signal: AbortSignal): () => void {
    this.requireReady();
    signal.throwIfAborted();
    if (this.listenerCount >= this.limits.maxListeners || stream.listeners.size >= this.limits.maxListenersPerStream) {
      throw new HistoryAdmissionError();
    }
    const subscriptionSignal = AbortSignal.any([signal, this.signal]);
    let released = false;
    const listener: Listener = {
      signal: subscriptionSignal,
      callback,
      release: () => {
        if (released) return;
        released = true;
        subscriptionSignal.removeEventListener("abort", listener.release);
        stream.listeners.delete(listener);
        this.listenerCount--;
      },
    };
    stream.listeners.add(listener);
    this.listenerCount++;
    subscriptionSignal.addEventListener("abort", listener.release, { once: true });
    if (subscriptionSignal.aborted) {
      listener.release();
      subscriptionSignal.throwIfAborted();
    }
    return listener.release;
  }

  publish(stream: RegisteredHistoryStream, payload: string, operation: HistorySqlOperation): void {
    this.checkOperation(operation);
    const listeners = [...stream.listeners];
    for (const listener of listeners) {
      this.checkOperation(operation);
      if (!stream.listeners.has(listener) || listener.signal.aborted) continue;
      try {
        listener.callback(payload);
      } catch {
        this.listenerFailures++;
        listener.release();
      }
    }
  }

  checkOperation(operation: HistorySqlOperation): void {
    operation.signal.throwIfAborted();
    this.signal.throwIfAborted();
    if (Date.now() >= operation.deadlineAt) throw new HistoryDeadlineError();
  }

  status(): HistoryBackingStatus {
    const usage = {
      pendingOperations: this.pendingOperations,
      queuedBytes: this.queuedBytes,
      listeners: this.listenerCount,
      listenerFailures: this.listenerFailures,
    };
    if (this.phase === "failed") return { ...usage, phase: "failed", reason: this.failure };
    return { ...usage, phase: this.phase };
  }

  closeAsync(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    this.closePromise = promise;
    this.resolveClose = resolve;
    this.rejectClose = reject;
    void promise.catch(() => undefined);
    if (this.phase !== "failed") this.phase = "closing";
    this.controller.abort(new HistoryBackingClosedError());
    this.releaseListeners();
    this.finishClose();
    return promise;
  }

  private bytes(value: string, maxBytes: number): number {
    if (typeof value !== "string") throw new TypeError("History payload must be a string");
    if (value.length > maxBytes) throw new HistoryAdmissionError();
    const bytes = Buffer.byteLength(value, "utf8");
    if (bytes > maxBytes) throw new HistoryAdmissionError();
    return bytes;
  }

  private requireReady(): void {
    if (this.phase === "failed") throw this.failure;
    if (this.phase !== "ready") throw new HistoryBackingClosedError();
    this.signal.throwIfAborted();
  }

  private fail(reason: unknown): void {
    if (this.phase === "failed" || this.phase === "closed") return;
    this.failure = reason;
    this.phase = "failed";
    this.controller.abort(reason);
    this.releaseListeners();
  }

  private releaseListeners(): void {
    for (const stream of this.streams) {
      for (const listener of stream.listeners) listener.release();
    }
  }

  private cancelWaiting(stream: RegisteredHistoryStream, reason: unknown): void {
    for (const task of stream.pending.splice(0)) {
      if (task.state !== "queued") continue;
      task.cancel(reason);
    }
  }

  private async drainStreamAsync(stream: RegisteredHistoryStream): Promise<void> {
    if (stream.draining) return;
    stream.draining = true;
    try {
      for (;;) {
        const task = stream.pending.shift();
        if (!task) break;
        if (task.state !== "queued") continue;
        task.state = "active";
        try {
          await task.executeAsync();
        } finally {
          task.cleanup();
        }
      }
    } finally {
      stream.draining = false;
      this.finishClose();
    }
  }

  private finishClose(): void {
    if (!this.closePromise || this.pendingOperations !== 0) return;
    this.signal.removeEventListener("abort", this.onLifetimeAbort);
    if (this.phase === "failed") this.rejectClose?.(this.failure);
    else {
      this.phase = "closed";
      this.resolveClose?.();
    }
    this.resolveClose = undefined;
    this.rejectClose = undefined;
  }
}
