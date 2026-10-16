import { EventEmitter } from "node:events";
import type { RedisOptions } from "ioredis";

export type StateMessageCallback = (message: string) => void | Promise<void>;
export interface StateSubscription {
  ready: Promise<void>;
  unsubscribe: () => void;
}

export interface StateTransaction {
  lpush(key: string, value: string): StateTransaction;
  ltrim(key: string, start: number, stop: number): StateTransaction;
  publish(channel: string, message: string): StateTransaction;
  pexpire(key: string, milliseconds: number): StateTransaction;
  hset(key: string, field: string, value: string): StateTransaction;
  exec(): Promise<[Error | null, unknown][] | null>;
}

/** The finite state operations used by Homarr, shared by local and Redis transports. */
export abstract class StateClient extends EventEmitter {
  abstract readonly options: RedisOptions;
  abstract readonly status: string;
  abstract get(key: string): Promise<string | null>;
  abstract mget(...keys: string[]): Promise<(string | null)[]>;
  abstract set(key: string, value: string, ...options: (string | number)[]): Promise<"OK" | null>;
  abstract del(key: string): Promise<number>;
  abstract lpush(key: string, value: string): Promise<number>;
  abstract lrange(key: string, start: number, stop: number): Promise<string[]>;
  abstract llen(key: string): Promise<number>;
  abstract ltrim(key: string, start: number, stop: number): Promise<string>;
  abstract lrem(key: string, count: number, value: string): Promise<number>;
  abstract hvals(key: string): Promise<string[]>;
  abstract publish(channel: string, message: string): Promise<number>;
  abstract subscribeChannel(channel: string, callback: StateMessageCallback): StateSubscription;
  abstract multi(): StateTransaction;
  abstract hello(): Promise<unknown>;
  abstract releaseOwnedAsync(key: string, token: string): Promise<void>;
  abstract renewOwnedAsync(key: string, token: string, ttlSeconds: number): Promise<boolean>;
  abstract setOwnedAsync(key: string, token: string, target: string, value: string, ttlMs?: number): Promise<boolean>;
  abstract advanceGenerationAsync(
    key: string,
    ttlSeconds: number,
    globalKey?: string,
    deleteKey?: string,
  ): Promise<string>;
  abstract compareAndSwapRevisionAsync(key: string, revision: number, value: string, ttlMs: number): Promise<boolean>;
  abstract incrementRateAsync(key: string, windowMs: number): Promise<{ count: number; retryAfterMs: number }>;
  abstract acquireConcurrencyAsync(key: string, owner: string, limit: number, ttlMs: number): Promise<boolean>;
  abstract releaseConcurrencyAsync(key: string, owner: string): Promise<void>;
}
