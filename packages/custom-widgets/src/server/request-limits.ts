import { createHash, randomUUID } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";

import { CustomWidgetDomainError } from "./errors";

const WINDOW_MS = 60_000;
// A query may legally follow three redirects with a ten-second timeout per hop.
// Keep the lease above that total and identify every acquisition so a late
// release can never remove capacity owned by a newer request.
export const CUSTOM_WIDGET_REQUEST_CONCURRENCY_TTL_MS = 60_000;
export const CUSTOM_WIDGET_USER_ITEM_CONCURRENCY_LIMIT = 4;
export const CUSTOM_WIDGET_DEFINITION_CONCURRENCY_LIMIT = 8;
const CATEGORY_LIMITS = { query: 60, action: 10, delete: 3, metadata: 60, refresh: 6 } as const;
const DEFINITION_CATEGORY_LIMITS = { query: 240, action: 40, delete: 12, metadata: 240, refresh: 24 } as const;
type RequestCategory = keyof typeof CATEGORY_LIMITS;

export interface RequestLimitInput {
  category: RequestCategory;
  userId?: string;
  anonymousId?: string;
  itemId: string;
  definitionId: string;
  load?: { signal?: AbortSignal };
}

export interface RequestLimitStore {
  incrementRate(key: string, windowMs: number): Promise<{ count: number; retryAfterMs: number }>;
  acquireConcurrency(key: string, ownerId: string, limit: number, ttlMs: number): Promise<boolean>;
  releaseConcurrency(key: string, ownerId: string): Promise<void>;
}

export interface RequestLimiterOptions {
  store?: RequestLimitStore;
  onStoreError?: (error: unknown) => void;
}

export class CustomWidgetRequestLimiter {
  private readonly rateBuckets = new Map<string, number[]>();
  private readonly concurrency = new Map<string, number>();

  public constructor(private readonly options: RequestLimiterOptions = {}) {}

  public async acquire(input: RequestLimitInput): Promise<() => Promise<void>> {
    if (input.load && input.category !== "query")
      throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Only load queries can wait for capacity" });
    assertLoadActive(input.load);
    const identity = input.userId ? `user:${input.userId}` : `anonymous:${input.anonymousId ?? "unattributed"}`;
    const isUnattributed = !input.userId && (!input.anonymousId || input.anonymousId === "unattributed");
    const unattributedRateKey = isUnattributed ? `custom-widget:rate:v3:unattributed:${input.category}` : undefined;
    const rateKey =
      input.category === "refresh"
        ? `custom-widget:rate:v2:item:refresh:${hashKey(input.itemId)}`
        : `custom-widget:rate:${input.category}:${hashKey(identity, input.itemId)}`;
    const definitionRateKey = `custom-widget:rate:v2:definition:${input.category}:${hashKey(input.definitionId)}`;
    const userKey = isUnattributed
      ? "custom-widget:concurrency:v3:unattributed"
      : `custom-widget:concurrency:v2:user-item:${hashKey(identity, input.itemId)}`;
    const definitionKey = `custom-widget:concurrency:v2:definition:${hashKey(input.definitionId)}`;
    if (!this.options.store)
      return this.acquireLocal(
        rateKey,
        definitionRateKey,
        userKey,
        definitionKey,
        input.category,
        input.load,
        unattributedRateKey,
      );
    try {
      return await this.acquireStored(
        rateKey,
        definitionRateKey,
        userKey,
        definitionKey,
        input.category,
        this.options.store,
        input.load,
        unattributedRateKey,
      );
    } catch (error) {
      if (error instanceof CustomWidgetDomainError) throw error;
      this.options.onStoreError?.(error);
      throw new CustomWidgetDomainError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Request limiter is unavailable",
      });
    }
  }

  private acquireLocal(
    rateKey: string,
    definitionRateKey: string,
    userKey: string,
    definitionKey: string,
    category: RequestCategory,
    load: RequestLimitInput["load"],
    unattributedRateKey: string | undefined,
  ) {
    const now = Date.now();
    if (unattributedRateKey)
      this.acquireLocalRate(unattributedRateKey, CATEGORY_LIMITS[category], now, load, UNATTRIBUTED_LOAD_RATE_MESSAGE);
    this.acquireLocalRate(rateKey, CATEGORY_LIMITS[category], now, load);
    this.acquireLocalRate(definitionRateKey, DEFINITION_CATEGORY_LIMITS[category], now, load);
    return this.waitForCapacity(() => {
      if (!this.acquireLocalConcurrency(userKey, CUSTOM_WIDGET_USER_ITEM_CONCURRENCY_LIMIT)) return undefined;
      if (!this.acquireLocalConcurrency(definitionKey, CUSTOM_WIDGET_DEFINITION_CONCURRENCY_LIMIT)) {
        this.releaseLocalConcurrency(userKey);
        return undefined;
      }
      let released = false;
      return async () => {
        if (released) return;
        released = true;
        this.releaseLocalConcurrency(userKey);
        this.releaseLocalConcurrency(definitionKey);
      };
    }, load);
  }

  private async acquireStored(
    rateKey: string,
    definitionRateKey: string,
    userKey: string,
    definitionKey: string,
    category: RequestCategory,
    store: RequestLimitStore,
    load: RequestLimitInput["load"],
    unattributedRateKey: string | undefined,
  ) {
    if (unattributedRateKey) {
      const rate = await store.incrementRate(unattributedRateKey, WINDOW_MS);
      if (rate.count > CATEGORY_LIMITS[category])
        throwLimit(rate.retryAfterMs, load ? UNATTRIBUTED_LOAD_RATE_MESSAGE : undefined);
    }
    const rate = await store.incrementRate(rateKey, WINDOW_MS);
    if (rate.count > CATEGORY_LIMITS[category]) throwLimit(rate.retryAfterMs, load ? LOAD_RATE_MESSAGE : undefined);
    const definitionRate = await store.incrementRate(definitionRateKey, WINDOW_MS);
    if (definitionRate.count > DEFINITION_CATEGORY_LIMITS[category])
      throwLimit(definitionRate.retryAfterMs, load ? LOAD_RATE_MESSAGE : undefined);
    return this.waitForCapacity(() => this.acquireStoredConcurrency(userKey, definitionKey, store), load);
  }

  private async acquireStoredConcurrency(userKey: string, definitionKey: string, store: RequestLimitStore) {
    const ownerId = randomUUID();
    if (
      !(await store.acquireConcurrency(
        userKey,
        ownerId,
        CUSTOM_WIDGET_USER_ITEM_CONCURRENCY_LIMIT,
        CUSTOM_WIDGET_REQUEST_CONCURRENCY_TTL_MS,
      ))
    ) {
      return undefined;
    }
    try {
      if (
        !(await store.acquireConcurrency(
          definitionKey,
          ownerId,
          CUSTOM_WIDGET_DEFINITION_CONCURRENCY_LIMIT,
          CUSTOM_WIDGET_REQUEST_CONCURRENCY_TTL_MS,
        ))
      ) {
        await store.releaseConcurrency(userKey, ownerId);
        return undefined;
      }
    } catch (error) {
      await store.releaseConcurrency(userKey, ownerId);
      throw error;
    }
    let released = false;
    return async () => {
      if (released) return;
      released = true;
      await Promise.all([store.releaseConcurrency(userKey, ownerId), store.releaseConcurrency(definitionKey, ownerId)]);
    };
  }

  private async waitForCapacity(
    acquire: () => (() => Promise<void>) | undefined | Promise<(() => Promise<void>) | undefined>,
    load: RequestLimitInput["load"],
  ): Promise<() => Promise<void>> {
    const deadline = performance.now() + WINDOW_MS;
    for (;;) {
      assertLoadActive(load);
      if (load && performance.now() >= deadline) throwLimit(1_000, LOAD_CAPACITY_MESSAGE);
      const release = await acquire();
      if (release) {
        if (load?.signal?.aborted) {
          await release();
          assertLoadActive(load);
        }
        if (load && performance.now() >= deadline) {
          await release();
          throwLimit(1_000, LOAD_CAPACITY_MESSAGE);
        }
        return release;
      }
      if (!load) return throwLimit(1_000);
      const remaining = deadline - performance.now();
      if (remaining <= 0) throwLimit(1_000, LOAD_CAPACITY_MESSAGE);
      try {
        await wait(Math.min(100, remaining), undefined, { signal: load.signal });
      } catch (error) {
        assertLoadActive(load);
        throw error;
      }
    }
  }

  private acquireLocalRate(
    key: string,
    limit: number,
    now: number,
    load: RequestLimitInput["load"],
    loadRateMessage = LOAD_RATE_MESSAGE,
  ): void {
    const recent = (this.rateBuckets.get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
    if (recent.length >= limit) throwLimit(WINDOW_MS - (now - (recent[0] ?? now)), load ? loadRateMessage : undefined);
    recent.push(now);
    this.rateBuckets.set(key, recent);
  }

  private acquireLocalConcurrency(key: string, limit: number): boolean {
    const count = this.concurrency.get(key) ?? 0;
    if (count >= limit) return false;
    this.concurrency.set(key, count + 1);
    return true;
  }

  private releaseLocalConcurrency(key: string): void {
    const count = this.concurrency.get(key) ?? 0;
    if (count <= 1) this.concurrency.delete(key);
    else this.concurrency.set(key, count - 1);
  }
}

const hashKey = (...parts: string[]) => createHash("sha256").update(parts.join("\0")).digest("hex");
const LOAD_RATE_MESSAGE =
  "Custom widget load query rate limit exceeded (60 per viewer/Item and 240 per definition per minute). Reduce load requests or wait before loading again.";
const UNATTRIBUTED_LOAD_RATE_MESSAGE =
  "Custom widget unattributed load query rate limit exceeded (60 per minute shared across Items and definitions). Wait before loading again or configure trusted proxy identity.";
const LOAD_CAPACITY_MESSAGE =
  "Custom widget load could not acquire capacity within 60 seconds. Reduce load requests or try again later.";
const assertLoadActive = (load: RequestLimitInput["load"]): void => {
  if (load?.signal?.aborted)
    throw new CustomWidgetDomainError({ code: "BAD_REQUEST", message: "Custom widget load was cancelled" });
};
const throwLimit = (retryAfterMs: number, message = "Custom widget request limit exceeded"): never => {
  throw new CustomWidgetDomainError({
    code: "TOO_MANY_REQUESTS",
    message,
    retryAfterMs: Math.max(1, retryAfterMs),
  });
};
