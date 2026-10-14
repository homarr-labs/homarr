import { randomUUID } from "node:crypto";
import { parse, stringify } from "superjson";

import type { LoggerMessage, LogLevel } from "../constants";
import { loggerMessageSchema, LOG_HISTORY_MAX_ENTRIES } from "../constants";
import type { LogHistoryBacking } from "./backing";

export type LogSubscriptionEvent =
  | { type: "history"; messages: LoggerMessage[] }
  | { type: "message"; message: LoggerMessage };

export interface LogAuthorizer {
  revoked: AbortSignal;
  requirePermissionAsync(permission: "other-view-logs", signal: AbortSignal): Promise<void>;
}

export type LogStreamClose =
  | { type: "disposed" }
  | { type: "aborted"; reason: unknown }
  | { type: "error"; error: unknown };

export interface LogObserver {
  nextAsync(event: LogSubscriptionEvent, signal: AbortSignal): Promise<void>;
  closed(reason: LogStreamClose): void;
}

export interface LogSubscription {
  readyAsync: Promise<void>;
  dispose(): void;
}

export class LogBackpressureError extends Error {
  constructor() {
    super("Log subscriber exceeded the bounded replay buffer");
    this.name = "LogBackpressureError";
  }
}

export const parseLoggerMessage = (serialized: string): LoggerMessage | null => {
  try {
    const result = loggerMessageSchema.safeParse(parse<unknown>(serialized));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};

export class LogHistoryStream {
  constructor(private readonly backing: LogHistoryBacking) {}

  async appendAsync(message: LoggerMessage, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    const validated = loggerMessageSchema.parse(message);
    await this.backing.appendAndPublishAsync(stringify(validated), LOG_HISTORY_MAX_ENTRIES, { signal });
    signal.throwIfAborted();
  }

  async recordAsync(message: string, level: LogLevel, signal: AbortSignal): Promise<LoggerMessage> {
    const entry: LoggerMessage = { id: randomUUID(), timestamp: new Date(), message, level };
    await this.appendAsync(entry, signal);
    return entry;
  }

  async getRecentAsync(authorizer: LogAuthorizer, signal: AbortSignal, levels: readonly LogLevel[] = ["info"]) {
    const authoritySignal = AbortSignal.any([signal, authorizer.revoked]);
    authoritySignal.throwIfAborted();
    await authorizer.requirePermissionAsync("other-view-logs", authoritySignal);
    authoritySignal.throwIfAborted();
    const messages = await this.readRecentAsync(authoritySignal, levels);
    await authorizer.requirePermissionAsync("other-view-logs", authoritySignal);
    authoritySignal.throwIfAborted();
    return messages;
  }

  subscribe(options: {
    authorizer: LogAuthorizer;
    signal: AbortSignal;
    levels?: readonly LogLevel[];
    observer: LogObserver;
  }): LogSubscription {
    const controller = new AbortController();
    const signal = AbortSignal.any([options.signal, options.authorizer.revoked, controller.signal]);
    const levels = [...(options.levels ?? ["info"])];
    const buffered: LoggerMessage[] = [];
    const bufferedIds = new Set<string>();
    const queue: LogSubscriptionEvent[] = [];
    const seen = new Set<string>();
    let closed = false;
    let loaded = false;
    let draining = false;
    let unsubscribe: (() => void) | null = null;
    const { promise: readyAsync, resolve: resolveReady, reject: rejectReady } = Promise.withResolvers<void>();
    void readyAsync.catch(() => undefined);

    const close = (reason: LogStreamClose) => {
      if (closed) return;
      closed = true;
      signal.removeEventListener("abort", onAbort);
      controller.abort(reason);
      const release = unsubscribe;
      unsubscribe = null;
      buffered.length = 0;
      bufferedIds.clear();
      queue.length = 0;
      seen.clear();
      rejectReady(reason.type === "error" ? reason.error : signal.reason);
      try {
        release?.();
      } catch {
        unsubscribe = null;
      }
      try {
        options.observer.closed(reason);
      } catch {
        return;
      }
    };
    const onAbort = () => close({ type: "aborted", reason: signal.reason });
    const remember = (message: LoggerMessage) => {
      if (seen.has(message.id)) return false;
      seen.add(message.id);
      if (seen.size > LOG_HISTORY_MAX_ENTRIES) {
        const oldest = seen.values().next().value;
        if (oldest !== undefined) seen.delete(oldest);
      }
      return true;
    };
    const drainAsync = async () => {
      if (draining || closed) return;
      draining = true;
      try {
        while (queue.length > 0) {
          if (closed) return;
          await options.authorizer.requirePermissionAsync("other-view-logs", signal);
          if (closed) return;
          signal.throwIfAborted();
          const event = queue.shift();
          if (event) await options.observer.nextAsync(event, signal);
          if (closed) return;
          signal.throwIfAborted();
        }
      } catch (error) {
        if (!closed) close({ type: "error", error });
      } finally {
        draining = false;
      }
    };
    const enqueue = (message: LoggerMessage) => {
      if (!remember(message)) return;
      if (queue.length >= LOG_HISTORY_MAX_ENTRIES + (queue[0]?.type === "history" ? 1 : 0)) {
        close({ type: "error", error: new LogBackpressureError() });
        return;
      }
      queue.push({ type: "message", message });
    };
    const onMessage = (serialized: string) => {
      if (closed) return;
      const message = parseLoggerMessage(serialized);
      if (!message || !levels.includes(message.level)) return;
      if (!loaded) {
        if (bufferedIds.has(message.id)) return;
        if (buffered.length >= LOG_HISTORY_MAX_ENTRIES) {
          close({ type: "error", error: new LogBackpressureError() });
          return;
        }
        buffered.push(message);
        bufferedIds.add(message.id);
        return;
      }
      enqueue(message);
      void drainAsync();
    };

    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
    else {
      void Promise.resolve()
        .then(async () => {
          await options.authorizer.requirePermissionAsync("other-view-logs", signal);
          if (closed) return;
          signal.throwIfAborted();
          const release = await this.backing.subscribeAsync(onMessage, { signal });
          if (closed) {
            release();
            return;
          }
          unsubscribe = release;
          const history = await this.readRecentAsync(signal, levels);
          if (closed) return;
          signal.throwIfAborted();
          const messages = history.filter(remember);
          queue.push({ type: "history", messages });
          loaded = true;
          for (const message of buffered) {
            if (closed) break;
            enqueue(message);
          }
          buffered.length = 0;
          bufferedIds.clear();
          if (closed) return;
          resolveReady();
          await drainAsync();
        })
        .catch((error: unknown) => {
          if (!closed) close({ type: "error", error });
        });
    }
    return { readyAsync, dispose: () => close({ type: "disposed" }) };
  }

  private async readRecentAsync(signal: AbortSignal, levels: readonly LogLevel[]) {
    let serialized: readonly string[];
    try {
      serialized = await this.backing.readNewestAsync(LOG_HISTORY_MAX_ENTRIES, { signal });
    } catch {
      signal.throwIfAborted();
      serialized = [];
    }
    signal.throwIfAborted();
    return serialized
      .slice(0, LOG_HISTORY_MAX_ENTRIES)
      .map(parseLoggerMessage)
      .filter((message): message is LoggerMessage => message !== null && levels.includes(message.level))
      .toReversed();
  }
}
