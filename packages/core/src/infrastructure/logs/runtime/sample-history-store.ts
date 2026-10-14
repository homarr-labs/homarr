import { parse, stringify } from "superjson";

import type { SampleHistoryBacking } from "./backing";
import type { LogStreamClose, LogSubscription } from "./log-history-stream";

export interface TimestampedSample<TData> {
  data: TData;
  timestamp: Date;
}

export interface SampleAuthorizer {
  revoked: AbortSignal;
  requireAccessAsync(name: string, action: "read" | "write" | "subscribe", signal: AbortSignal): Promise<void>;
}

export interface SampleHistoryResources<TData> {
  backing: SampleHistoryBacking;
  authorizer: SampleAuthorizer;
  parseData(data: unknown): TData;
  now(): Date;
}

export class SampleHistoryStore<TData> {
  readonly maxElements: number;

  constructor(
    readonly name: string,
    private readonly resources: SampleHistoryResources<TData>,
    maxElements = 15,
  ) {
    if (!Number.isSafeInteger(maxElements) || maxElements < 1) throw new RangeError("Invalid sample history bound");
    this.maxElements = maxElements;
  }

  async pushAsync(data: TData, signal: AbortSignal): Promise<void> {
    const authoritySignal = await this.authorizeAsync("write", signal);
    const sample = { data: this.resources.parseData(data), timestamp: this.resources.now() };
    await this.resources.backing.pushAsync(this.name, stringify(sample), this.maxElements, { signal: authoritySignal });
    authoritySignal.throwIfAborted();
  }

  async publishAndPushAsync(data: TData, signal: AbortSignal): Promise<void> {
    const authoritySignal = await this.authorizeAsync("write", signal);
    const validated = this.resources.parseData(data);
    await this.resources.backing.publishAsync(this.name, stringify(validated), { signal: authoritySignal });
    authoritySignal.throwIfAborted();
    await this.pushAsync(validated, authoritySignal);
  }

  async clearAsync(signal: AbortSignal): Promise<void> {
    const authoritySignal = await this.authorizeAsync("write", signal);
    await this.resources.backing.clearAsync(this.name, { signal: authoritySignal });
    authoritySignal.throwIfAborted();
  }

  async getLastAsync(signal: AbortSignal): Promise<TimestampedSample<TData> | null> {
    const entry = (await this.readSerializedAsync(signal)).at(-1);
    return entry === undefined ? null : this.parseEntry(entry);
  }

  async getSliceAsync(startIndex: number, endIndex: number, signal: AbortSignal): Promise<TimestampedSample<TData>[]> {
    if (!Number.isSafeInteger(startIndex) || !Number.isSafeInteger(endIndex)) {
      throw new RangeError("Sample slice endpoints must be integers");
    }
    const entries = await this.readSerializedAsync(signal);
    const start = startIndex < 0 ? Math.max(0, entries.length + startIndex) : startIndex;
    const end = endIndex < 0 ? entries.length + endIndex : endIndex;
    return end < start ? [] : entries.slice(start, end + 1).map((entry) => this.parseEntry(entry));
  }

  async getSliceUntilTimeAsync(time: Date, signal: AbortSignal): Promise<TData[]> {
    const entries = await this.readSerializedAsync(signal);
    return entries
      .slice(0, -1)
      .map((entry) => this.parseEntry(entry))
      .filter((entry) => !(entry.timestamp < time))
      .map((entry) => entry.data);
  }

  async getLengthAsync(signal: AbortSignal): Promise<number> {
    return (await this.readSerializedAsync(signal)).length;
  }

  subscribe(options: {
    signal: AbortSignal;
    nextAsync(data: TData, signal: AbortSignal): Promise<void>;
    closed(reason: LogStreamClose): void;
  }): LogSubscription {
    const controller = new AbortController();
    const signal = AbortSignal.any([options.signal, this.resources.authorizer.revoked, controller.signal]);
    const queue: { data: TData }[] = [];
    let closed = false;
    let draining = false;
    let unsubscribe: (() => void) | null = null;
    const { promise: readyAsync, resolve: resolveReady, reject: rejectReady } = Promise.withResolvers<void>();
    void readyAsync.catch(() => undefined);
    const close = (reason: LogStreamClose) => {
      if (closed) return;
      closed = true;
      signal.removeEventListener("abort", onAbort);
      controller.abort(reason);
      queue.length = 0;
      rejectReady(reason.type === "error" ? reason.error : signal.reason);
      const release = unsubscribe;
      unsubscribe = null;
      try {
        release?.();
      } catch {
        unsubscribe = null;
      }
      try {
        options.closed(reason);
      } catch {
        return;
      }
    };
    const onAbort = () => close({ type: "aborted", reason: signal.reason });
    const drainAsync = async () => {
      if (closed || draining) return;
      draining = true;
      try {
        while (queue.length > 0) {
          if (closed) return;
          await this.authorizeAsync("subscribe", signal);
          if (closed) return;
          const entry = queue.shift();
          if (entry) await options.nextAsync(entry.data, signal);
        }
      } catch (error) {
        if (!closed) close({ type: "error", error });
      } finally {
        draining = false;
      }
    };
    const onMessage = (serialized: string) => {
      if (closed) return;
      try {
        const data = this.resources.parseData(parse<unknown>(serialized));
        if (queue.length >= this.maxElements) throw new Error("Sample subscriber exceeded the bounded buffer");
        queue.push({ data });
        void drainAsync();
      } catch (error) {
        close({ type: "error", error });
      }
    };
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
    else {
      void this.authorizeAsync("subscribe", signal)
        .then(async () => {
          if (closed) return;
          const release = await this.resources.backing.subscribeAsync(this.name, onMessage, { signal });
          if (closed) {
            release();
            return;
          }
          unsubscribe = release;
          resolveReady();
        })
        .catch((error: unknown) => {
          if (!closed) close({ type: "error", error });
        });
    }
    return { readyAsync, dispose: () => close({ type: "disposed" }) };
  }

  private async authorizeAsync(action: "read" | "write" | "subscribe", signal: AbortSignal) {
    const authoritySignal = AbortSignal.any([signal, this.resources.authorizer.revoked]);
    authoritySignal.throwIfAborted();
    await this.resources.authorizer.requireAccessAsync(this.name, action, authoritySignal);
    authoritySignal.throwIfAborted();
    return authoritySignal;
  }

  private async readSerializedAsync(signal: AbortSignal): Promise<readonly string[]> {
    const authoritySignal = await this.authorizeAsync("read", signal);
    const serialized = await this.resources.backing.readNewestAsync(this.name, this.maxElements, {
      signal: authoritySignal,
    });
    await this.authorizeAsync("read", authoritySignal);
    return serialized.slice(0, this.maxElements);
  }

  private parseEntry(value: string): TimestampedSample<TData> {
    const entry = parse<unknown>(value);
    if (typeof entry !== "object" || entry === null || !("data" in entry) || !("timestamp" in entry)) {
      throw new TypeError("Invalid timestamped sample");
    }
    if (!(entry.timestamp instanceof Date) || !Number.isFinite(entry.timestamp.getTime())) {
      throw new TypeError("Invalid sample timestamp");
    }
    return { data: this.resources.parseData(entry.data), timestamp: entry.timestamp };
  }
}
