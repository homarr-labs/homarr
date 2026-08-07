import Redis from "ioredis";

import type { CacheHandler } from "next/dist/server/lib/cache-handlers/types";

type CacheEntry = Awaited<ReturnType<CacheHandler["get"]>> & {};

// eslint-disable-next-line no-underscore-dangle
const BUILD_ID = process.env.__NEXT_BUILD_ID ?? "dev";

export class RedisCacheHandler implements CacheHandler {
  private redis: Redis;
  private pendingSets = new Map<string, Promise<CacheEntry>>();
  private tagCache = new Map<string, number>();
  private loggedError = false;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number(process.env.REDIS_CACHE_DB ?? 1),
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });
    this.redis.on("error", () => {
      if (!this.loggedError) {
        console.warn("[next-cache-handler] Redis connection error, cache will degrade to always-miss");
        this.loggedError = true;
      }
    });
  }

  private entryKey(cacheKey: string) {
    return `nextCache:v1:${BUILD_ID}:${cacheKey}`;
  }

  private tagKey(tag: string) {
    return `nextCache:tag:${tag}`;
  }

  async get(cacheKey: string, softTags: string[]): Promise<CacheEntry | undefined> {
    const pending = this.pendingSets.get(cacheKey);
    if (pending) return pending;

    try {
      await this.redis.connect().catch(() => {});
      const raw = await this.redis.getBuffer(this.entryKey(cacheKey));
      if (!raw) return undefined;

      const parsed = JSON.parse(raw.toString()) as {
        tags: string[];
        stale: number;
        timestamp: number;
        expire: number;
        revalidate: number;
        body: number[];
      };

      const allTags = [...parsed.tags, ...softTags];
      const expiration = await this.getExpiration(allTags);
      if (expiration !== 0 && expiration > parsed.timestamp) {
        return undefined;
      }

      const body = new Uint8Array(parsed.body);
      return {
        value: new ReadableStream({
          start(controller) {
            controller.enqueue(body);
            controller.close();
          },
        }),
        tags: parsed.tags,
        stale: parsed.stale,
        timestamp: parsed.timestamp,
        expire: parsed.expire,
        revalidate: parsed.revalidate,
      };
    } catch {
      return undefined;
    }
  }

  async set(cacheKey: string, pendingEntry: Promise<CacheEntry>): Promise<void> {
    this.pendingSets.set(cacheKey, pendingEntry);

    try {
      const entry = await pendingEntry;
      const reader = entry.value.getReader();
      const chunks: Uint8Array[] = [];
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) chunks.push(result.value);
      }

      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const body = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.length;
      }

      const serialized = JSON.stringify({
        tags: entry.tags,
        stale: entry.stale,
        timestamp: entry.timestamp,
        expire: entry.expire,
        revalidate: entry.revalidate,
        body: Array.from(body),
      });

      const ttlMs = entry.expire * 1000;
      if (ttlMs <= 0) return; // Dynamic entries (expire: 0) should not be persisted
      await this.redis.connect().catch(() => {});
      await this.redis.set(this.entryKey(cacheKey), serialized, "PX", ttlMs);
    } catch {
      // Fail open
    } finally {
      if (this.pendingSets.get(cacheKey) === pendingEntry) {
        this.pendingSets.delete(cacheKey);
      }
    }
  }

  async refreshTags(): Promise<void> {
    try {
      await this.redis.connect().catch(() => {});
      this.tagCache.clear();
      let cursor = "0";
      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, "MATCH", "nextCache:tag:*", "COUNT", 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          const values = await this.redis.mget(...keys);
          for (let i = 0; i < keys.length; i++) {
            const tag = keys[i]?.replace("nextCache:tag:", "");
            if (!tag) continue;
            const val = values[i];
            if (val) this.tagCache.set(tag, Number(val));
          }
        }
      } while (cursor !== "0");
    } catch {
      // Fail open — stale tag cache is better than crash
    }
  }

  async getExpiration(tags: string[]): Promise<number> {
    if (tags.length === 0) return 0;

    const missingTags: string[] = [];
    let maxTimestamp = 0;

    for (const tag of tags) {
      const cached = this.tagCache.get(tag);
      if (cached !== undefined) {
        if (cached > maxTimestamp) maxTimestamp = cached;
      } else {
        missingTags.push(tag);
      }
    }

    if (missingTags.length > 0) {
      try {
        await this.redis.connect().catch(() => {});
        const keys = missingTags.map((t) => this.tagKey(t));
        const values = await this.redis.mget(...keys);
        for (let i = 0; i < missingTags.length; i++) {
          const val = values[i];
          if (val) {
            const ts = Number(val);
            const missingTag = missingTags[i];
            if (missingTag) this.tagCache.set(missingTag, ts);
            if (ts > maxTimestamp) maxTimestamp = ts;
          }
        }
      } catch {
        // Fail open
      }
    }

    return maxTimestamp;
  }

  async updateTags(tags: string[], durations?: { expire?: number }): Promise<void> {
    if (tags.length === 0) return;
    try {
      await this.redis.connect().catch(() => {});
      const now = Date.now();
      const pipeline = this.redis.pipeline();
      for (const tag of tags) {
        const key = this.tagKey(tag);
        pipeline.set(key, String(now));
        if (durations?.expire) {
          pipeline.pexpire(key, durations.expire * 1000);
        } else {
          pipeline.pexpire(key, 7 * 24 * 60 * 60 * 1000);
        }
        this.tagCache.set(tag, now);
      }
      await pipeline.exec();
    } catch {
      // Fail open
    }
  }
}
