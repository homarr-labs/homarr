import type { RedisOptions } from "ioredis";

import type { MemoryStateStore } from "./memory-store";
import { StateClient } from "./state";
import type { StateMessageCallback, StateTransaction } from "./state";

/** Adapter for the exact state operations Homarr uses; arbitrary Redis/Lua is intentionally absent. */
export class MemoryStateClient extends StateClient {
  readonly status = "ready";
  constructor(
    readonly store: MemoryStateStore,
    readonly options: RedisOptions = {},
  ) {
    super();
  }
  async get(key: string) {
    return this.store.get(key);
  }
  async mget(...keys: string[]) {
    return keys.map((key) => this.store.get(key));
  }
  async set(key: string, value: string, ...options: (string | number)[]) {
    return this.store.set(key, value, options);
  }
  async del(key: string) {
    return this.store.del(key);
  }
  async lpush(key: string, value: string) {
    return this.store.lpush(key, value);
  }
  async lrange(key: string, start: number, stop: number) {
    return this.store.lrange(key, start, stop);
  }
  async llen(key: string) {
    return this.store.llen(key);
  }
  async ltrim(key: string, start: number, stop: number) {
    return this.store.ltrim(key, start, stop);
  }
  async lrem(key: string, count: number, value: string) {
    return this.store.lrem(key, count, value);
  }
  async hvals(key: string) {
    return this.store.hvals(key);
  }
  async publish(channel: string, message: string) {
    return this.store.publish(channel, message);
  }
  subscribeChannel(channel: string, callback: StateMessageCallback) {
    return this.store.subscribe(channel, callback);
  }
  async hello() {
    return { mode: "memory", ...this.store.stats };
  }
  async releaseOwnedAsync(key: string, token: string) {
    this.store.releaseOwned(key, token);
  }
  async renewOwnedAsync(key: string, token: string, ttlSeconds: number) {
    return this.store.renewOwned(key, token, ttlSeconds);
  }
  async setOwnedAsync(key: string, token: string, target: string, value: string, ttlMs?: number) {
    return this.store.setOwned(key, token, target, value, ttlMs);
  }
  async advanceGenerationAsync(key: string, ttlSeconds: number, globalKey?: string, deleteKey?: string) {
    return this.store.advanceGeneration(key, ttlSeconds, globalKey, deleteKey);
  }
  async compareAndSwapRevisionAsync(key: string, revision: number, value: string, ttlMs: number) {
    return this.store.compareAndSwapRevision(key, revision, value, ttlMs);
  }
  async incrementRateAsync(key: string, windowMs: number) {
    return this.store.incrementRate(key, windowMs);
  }
  async acquireConcurrencyAsync(key: string, owner: string, limit: number, ttlMs: number) {
    return this.store.acquireConcurrency(key, owner, limit, ttlMs);
  }
  async releaseConcurrencyAsync(key: string, owner: string) {
    this.store.releaseConcurrency(key, owner);
  }

  multi(): StateTransaction {
    const commands: (() => unknown)[] = [];
    let executed = false;
    const enqueue = (operation: () => unknown) => {
      if (executed) throw new Error("State transaction was already executed");
      if (commands.length >= 32) throw new Error("State transaction command limit exceeded");
      commands.push(operation);
      return transaction;
    };
    const transaction: StateTransaction = {
      lpush: (key, value) => enqueue(() => this.store.lpush(key, value)),
      ltrim: (key, start, stop) => enqueue(() => this.store.ltrim(key, start, stop)),
      publish: (channel, message) => enqueue(() => this.store.publish(channel, message)),
      pexpire: (key, milliseconds) => enqueue(() => this.store.expire(key, milliseconds)),
      hset: (key, field, value) => enqueue(() => this.store.hset(key, field, value)),
      exec: async () => {
        if (executed) throw new Error("State transaction was already executed");
        executed = true;
        // Execute synchronously in one turn: no competing task can interleave a command.
        const results: [Error | null, unknown][] = [];
        for (const operation of commands) {
          try {
            results.push([null, operation()]);
          } catch (error) {
            let cause = new Error("Local state operation failed");
            if (error instanceof Error) cause = error;
            results.push([cause, null]);
          }
        }
        commands.length = 0;
        return results;
      },
    };
    return transaction;
  }
}
