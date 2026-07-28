import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { createRedisClient } from "@homarr/core/infrastructure/redis";
import type { RedisClient } from "@homarr/core/infrastructure/redis";
import type { CustomWidgetHttpRequest, CustomWidgetHttpResponse } from "@homarr/custom-widgets/server";

import { useProcessLocalCustomWidgetState } from "../../custom-widget-state-mode";

const CACHE_KEY_PREFIX = "homarr:custom-widget:response:v1:";
const VERSION_KEY_PREFIX = "homarr:custom-widget:response-version:v1:";
const CACHE_INDEX_KEY = "homarr:custom-widget:response-index:v1";
const MAX_CACHE_ENTRIES = 1_000;
const MAX_CACHE_TTL_SECONDS = 3_600;
const MAX_CACHE_VALUE_BYTES = 1024 * 1024 + 1024;
const VERSION_TTL_SECONDS = MAX_CACHE_TTL_SECONDS * 2;

const logger = createLogger({ module: "custom-widget:response-cache" });

interface ResponseCacheStore {
  getVersions(namespaces: readonly string[]): Promise<number[]>;
  incrementVersion(namespace: string): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, namespace: string, value: string, ttlSeconds: number): Promise<void>;
}

class RedisResponseCacheStore implements ResponseCacheStore {
  public constructor(private readonly redis: RedisClient) {}

  public async getVersions(namespaces: readonly string[]): Promise<number[]> {
    const values = await this.redis.mget(...namespaces.map(getVersionKey));
    return values.map((value) => {
      const parsed = Number(value ?? 0);
      return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
    });
  }

  public async incrementVersion(namespace: string): Promise<void> {
    const key = getVersionKey(namespace);
    await this.redis.multi().incr(key).expire(key, VERSION_TTL_SECONDS).exec();
  }

  public get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  public async set(key: string, _namespace: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.eval(
      `
        redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[2])
        redis.call("ZADD", KEYS[2], ARGV[3] + (ARGV[2] * 1000), KEYS[1])
        redis.call("ZREMRANGEBYSCORE", KEYS[2], "-inf", ARGV[3])
        local count = redis.call("ZCARD", KEYS[2])
        local maximum = tonumber(ARGV[4])
        if count > maximum then
          local victims = redis.call("ZRANGE", KEYS[2], 0, count - maximum - 1)
          for _, victim in ipairs(victims) do
            redis.call("DEL", victim)
            redis.call("ZREM", KEYS[2], victim)
          end
        end
        redis.call("EXPIRE", KEYS[2], ARGV[5])
        return 1
      `,
      2,
      key,
      CACHE_INDEX_KEY,
      value,
      ttlSeconds,
      Date.now(),
      MAX_CACHE_ENTRIES,
      VERSION_TTL_SECONDS,
    );
  }
}

class LocalResponseCacheStore implements ResponseCacheStore {
  private readonly versions = new Map<string, number>();
  private readonly responses = new Map<string, { namespace: string; value: string; expiresAt: number }>();

  public async getVersions(namespaces: readonly string[]): Promise<number[]> {
    return namespaces.map((namespace) => this.versions.get(namespace) ?? 0);
  }

  public async incrementVersion(namespace: string): Promise<void> {
    this.versions.set(namespace, (this.versions.get(namespace) ?? 0) + 1);
  }

  public async get(key: string): Promise<string | null> {
    const response = this.responses.get(key);
    if (!response) return null;
    if (response.expiresAt <= Date.now()) {
      this.responses.delete(key);
      return null;
    }
    return response.value;
  }

  public async set(key: string, namespace: string, value: string, ttlSeconds: number): Promise<void> {
    for (const [candidate, response] of this.responses) {
      if (response.expiresAt <= Date.now()) this.responses.delete(candidate);
    }
    while (this.responses.size >= MAX_CACHE_ENTRIES) {
      const oldest = this.responses.keys().next().value as string | undefined;
      if (!oldest) break;
      this.responses.delete(oldest);
    }
    this.responses.set(key, {
      namespace,
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}

let defaultStore: ResponseCacheStore | undefined;
let defaultController: CustomWidgetResponseCacheController | undefined;

function getDefaultStore(): ResponseCacheStore {
  if (defaultStore) return defaultStore;
  const useLocal = useProcessLocalCustomWidgetState();
  defaultStore = useLocal ? new LocalResponseCacheStore() : new RedisResponseCacheStore(createRedisClient());
  return defaultStore;
}

export interface CustomWidgetResponseCacheController {
  withCache(
    input: CustomWidgetHttpRequest,
    execute: () => Promise<CustomWidgetHttpResponse>,
  ): Promise<CustomWidgetHttpResponse>;
  invalidate(prefixes: readonly string[]): Promise<void>;
}

class ResponseCacheController implements CustomWidgetResponseCacheController {
  private readonly inFlight = new Map<string, Promise<CustomWidgetHttpResponse>>();
  private readonly pendingInvalidations = new Set<string>();

  public constructor(private readonly store: ResponseCacheStore) {}

  public async withCache(
    input: CustomWidgetHttpRequest,
    execute: () => Promise<CustomWidgetHttpResponse>,
  ): Promise<CustomWidgetHttpResponse> {
    const ttlSeconds = Math.min(Math.max(input.cacheTtlSeconds ?? 0, 0), MAX_CACHE_TTL_SECONDS);
    if (input.kind !== "query" || !input.cacheKey || ttlSeconds <= 0) return execute();

    const namespace = getCacheNamespace(input.cacheKey);
    if (!namespace) {
      logger.warn("Rejected malformed custom widget response cache key", {
        event: "custom_widget_cache_key_rejected",
      });
      return execute();
    }

    let responseKey: string;
    let pending: Promise<CustomWidgetHttpResponse> | undefined;
    let cached: CustomWidgetHttpResponse | null = null;
    try {
      await this.flushPendingInvalidations();
      const invalidationNamespaces = getInvalidationNamespaces(namespace);
      const versions = await this.store.getVersions(invalidationNamespaces);
      responseKey = getResponseKey(input.cacheKey, versions);
      pending = this.inFlight.get(responseKey);
      if (!pending) {
        cached = parseCachedResponse(await this.store.get(responseKey));
        if (!cached) pending = this.inFlight.get(responseKey);
      }
    } catch (error) {
      logger.warn("Custom widget response cache unavailable; executing without cache", {
        event: "custom_widget_cache_unavailable",
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      return execute();
    }

    if (pending) return pending;
    if (cached) return cached;

    let request: Promise<CustomWidgetHttpResponse>;
    request = Promise.resolve()
      .then(execute)
      .then(async (response) => {
        if (!response.ok) return response;
        try {
          const serialized = JSON.stringify(response);
          if (Buffer.byteLength(serialized, "utf8") > MAX_CACHE_VALUE_BYTES) {
            logger.warn("Skipped oversized custom widget response cache entry", {
              event: "custom_widget_cache_entry_rejected",
              cacheNamespace: namespace,
            });
            return response;
          }
          await this.store.set(responseKey, namespace, serialized, ttlSeconds);
        } catch (error) {
          logger.warn("Failed to store custom widget response cache entry", {
            event: "custom_widget_cache_write_failed",
            errorName: error instanceof Error ? error.name : "UnknownError",
          });
        }
        return response;
      })
      .finally(() => {
        if (this.inFlight.get(responseKey) === request) this.inFlight.delete(responseKey);
      });
    this.inFlight.set(responseKey, request);
    return request;
  }

  public async invalidate(prefixes: readonly string[]): Promise<void> {
    const namespaces = [...new Set(prefixes.filter((prefix) => prefix.length > 0))];
    if (namespaces.length === 0) return;
    try {
      await Promise.all(namespaces.map((namespace) => this.store.incrementVersion(namespace)));
      for (const namespace of namespaces) this.pendingInvalidations.delete(namespace);
    } catch (error) {
      namespaces.forEach((namespace) => this.pendingInvalidations.add(namespace));
      logger.error("Failed to invalidate custom widget response cache", {
        event: "custom_widget_cache_invalidation_failed",
        invalidationCount: namespaces.length,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  private async flushPendingInvalidations(): Promise<void> {
    if (this.pendingInvalidations.size === 0) return;
    const namespaces = [...this.pendingInvalidations];
    await Promise.all(namespaces.map((namespace) => this.store.incrementVersion(namespace)));
    namespaces.forEach((namespace) => this.pendingInvalidations.delete(namespace));
  }
}

function getDefaultController(): CustomWidgetResponseCacheController {
  defaultController ??= new ResponseCacheController(getDefaultStore());
  return defaultController;
}

export function createRedisCustomWidgetResponseCache(redis: RedisClient): CustomWidgetResponseCacheController {
  return new ResponseCacheController(new RedisResponseCacheStore(redis));
}

export function withCustomWidgetResponseCache(
  input: CustomWidgetHttpRequest,
  execute: () => Promise<CustomWidgetHttpResponse>,
): Promise<CustomWidgetHttpResponse> {
  return getDefaultController().withCache(input, execute);
}

export function invalidateCustomWidgetResponseCache(prefixes: readonly string[]): Promise<void> {
  return getDefaultController().invalidate(prefixes);
}

function getCacheNamespace(key: string): string | null {
  const separator = key.lastIndexOf(":");
  if (separator <= 0 || separator === key.length - 1) return null;
  return key.slice(0, separator + 1);
}

function getInvalidationNamespaces(namespace: string): string[] {
  const namespaces: string[] = [];
  for (let separator = namespace.indexOf(":"); separator >= 0; separator = namespace.indexOf(":", separator + 1)) {
    namespaces.push(namespace.slice(0, separator + 1));
  }
  return namespaces;
}

function getResponseKey(key: string, versions: readonly number[]): string {
  return `${CACHE_KEY_PREFIX}${hash(`${versions.join(".")}:${key}`)}`;
}

function getVersionKey(namespace: string): string {
  return `${VERSION_KEY_PREFIX}${hash(namespace)}`;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseCachedResponse(value: string | null): CustomWidgetHttpResponse | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<CustomWidgetHttpResponse>;
    if (
      typeof parsed.ok !== "boolean" ||
      typeof parsed.status !== "number" ||
      typeof parsed.statusText !== "string" ||
      !("data" in parsed)
    ) {
      return null;
    }
    return parsed as CustomWidgetHttpResponse;
  } catch {
    return null;
  }
}
