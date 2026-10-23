import { createRequire } from "node:module";
import type { Redis, RedisOptions } from "ioredis";

import { StateClient } from "./state";
import type { StateMessageCallback, StateTransaction } from "./state";

const RELEASE_OWNED =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
const RENEW_OWNED =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], ARGV[2]) else return 0 end";
const SET_OWNED =
  "if redis.call('get', KEYS[1]) ~= ARGV[1] then return 0 end redis.call('set', KEYS[2], ARGV[2], 'PX', ARGV[3]) return 1";
const SET_PERSISTENT_OWNED =
  "if redis.call('get', KEYS[1]) ~= ARGV[1] then return 0 end redis.call('set', KEYS[2], ARGV[2]) return 1";
const ADVANCE_GENERATION = `
local generation = redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], ARGV[1])
if #KEYS > 2 then redis.call('DEL', KEYS[3]) end
local global = false
if #KEYS > 1 then global = redis.call('GET', KEYS[2]) end
if global and global ~= '0' then return global .. ':' .. generation end
return tostring(generation)
`;
const COMPARE_REVISION = `
local current = redis.call('GET', KEYS[1])
if not current then return 0 end
local ok, parsed = pcall(cjson.decode, current)
if not ok or type(parsed) ~= 'table' or tonumber(parsed.revision) ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
return 1
`;
const RATE = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return { count, redis.call('PTTL', KEYS[1]) }
`;
const ACQUIRE_CONCURRENCY = `
local time = redis.call('TIME')
local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[2]) then return 0 end
redis.call('ZADD', KEYS[1], now + tonumber(ARGV[3]), ARGV[1])
local newest = redis.call('ZREVRANGE', KEYS[1], 0, 0, 'WITHSCORES')
redis.call('PEXPIREAT', KEYS[1], newest[2])
return 1
`;

/** Redis implementation. ioredis is loaded only when a Redis-backed client is requested. */
export class RedisStateClient extends StateClient {
  private readonly redis: Redis;
  private readonly subscriptions = new Map<string, Set<StateMessageCallback>>();
  private readonly readiness = new Map<string, Promise<void>>();
  constructor(readonly options: RedisOptions) {
    super();
    // Node's bundled migration and CLI entrypoints are CommonJS; the server is ESM.
    let moduleFilename = import.meta.url;
    if (typeof __filename === "string") moduleFilename = __filename;
    const requireRedis = createRequire(moduleFilename);
    const { Redis: Driver } = requireRedis("ioredis") as { Redis: typeof Redis };
    this.redis = new Driver(options);
    for (const event of ["ready", "end", "error"]) {
      this.redis.on(event, (...arguments_) => {
        if (event === "error" && this.listenerCount("error") === 0) return;
        this.emit(event, ...arguments_);
      });
    }
    this.redis.on("message", (channel, message) => {
      for (const callback of this.subscriptions.get(channel) ?? []) {
        try {
          void Promise.resolve(callback(message)).catch(() => undefined);
        } catch {
          /* Subscriber failures do not interrupt delivery. */
        }
      }
    });
  }
  get status() {
    return this.redis.status;
  }
  get(key: string) {
    return this.redis.get(key);
  }
  mget(...keys: string[]) {
    return this.redis.mget(...keys);
  }
  async set(key: string, value: string, ...options: (string | number)[]): Promise<"OK" | null> {
    const result = await this.redis.call("SET", key, value, ...options);
    if (result === "OK") return "OK";
    if (result === null) return null;
    throw new Error("Unexpected state SET response");
  }
  del(key: string) {
    return this.redis.del(key);
  }
  lpush(key: string, value: string) {
    return this.redis.lpush(key, value);
  }
  lrange(key: string, start: number, stop: number) {
    return this.redis.lrange(key, start, stop);
  }
  llen(key: string) {
    return this.redis.llen(key);
  }
  ltrim(key: string, start: number, stop: number) {
    return this.redis.ltrim(key, start, stop);
  }
  lrem(key: string, count: number, value: string) {
    return this.redis.lrem(key, count, value);
  }
  hvals(key: string) {
    return this.redis.hvals(key);
  }
  publish(channel: string, message: string) {
    return this.redis.publish(channel, message);
  }
  multi(): StateTransaction {
    return this.redis.multi();
  }
  hello() {
    return this.redis.hello();
  }
  subscribeChannel(channel: string, callback: StateMessageCallback) {
    const callbacks = this.subscriptions.get(channel) ?? new Set<StateMessageCallback>();
    callbacks.add(callback);
    this.subscriptions.set(channel, callbacks);
    let ready = this.readiness.get(channel);
    if (!ready) {
      ready = this.redis.subscribe(channel).then(() => undefined);
      this.readiness.set(channel, ready);
      void ready.catch(() => {
        if (this.readiness.get(channel) === ready) this.readiness.delete(channel);
      });
    }
    let active = true;
    return {
      ready,
      unsubscribe: () => {
        if (!active) return;
        active = false;
        callbacks.delete(callback);
        if (callbacks.size) return;
        this.subscriptions.delete(channel);
        this.readiness.delete(channel);
        void this.redis.unsubscribe(channel).catch(() => undefined);
      },
    };
  }
  async releaseOwnedAsync(key: string, token: string) {
    await this.redis.eval(RELEASE_OWNED, 1, key, token);
  }
  async renewOwnedAsync(key: string, token: string, ttlSeconds: number) {
    return Number(await this.redis.eval(RENEW_OWNED, 1, key, token, ttlSeconds)) === 1;
  }
  async setOwnedAsync(key: string, token: string, target: string, value: string, ttlMs?: number) {
    if (ttlMs === undefined)
      return Number(await this.redis.eval(SET_PERSISTENT_OWNED, 2, key, target, token, value)) === 1;
    return Number(await this.redis.eval(SET_OWNED, 2, key, target, token, value, ttlMs)) === 1;
  }
  async advanceGenerationAsync(key: string, ttlSeconds: number, globalKey?: string, deleteKey?: string) {
    const keys = [key];
    if (globalKey) keys.push(globalKey);
    if (deleteKey) {
      if (!globalKey) throw new Error("Session invalidation requires a global generation key");
      keys.push(deleteKey);
    }
    return String(await this.redis.eval(ADVANCE_GENERATION, keys.length, ...keys, ttlSeconds));
  }
  async compareAndSwapRevisionAsync(key: string, revision: number, value: string, ttlMs: number) {
    return Number(await this.redis.eval(COMPARE_REVISION, 1, key, revision, value, ttlMs)) === 1;
  }
  async incrementRateAsync(key: string, windowMs: number) {
    const [count, retryAfterMs] = (await this.redis.eval(RATE, 1, key, windowMs)) as [number, number];
    return { count: Number(count), retryAfterMs: Number(retryAfterMs) || windowMs };
  }
  async acquireConcurrencyAsync(key: string, owner: string, limit: number, ttlMs: number) {
    return Number(await this.redis.eval(ACQUIRE_CONCURRENCY, 1, key, owner, limit, ttlMs)) === 1;
  }
  async releaseConcurrencyAsync(key: string, owner: string) {
    await this.redis.eval("return redis.call('ZREM', KEYS[1], ARGV[1])", 1, key, owner);
  }
}
