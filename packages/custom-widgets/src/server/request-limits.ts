import { createHash, randomUUID } from "node:crypto";

import { CustomWidgetDomainError } from "./errors";

const WINDOW_MS = 60_000;
// A query may legally follow three redirects with a ten-second timeout per hop.
// Keep the lease above that total and identify every acquisition so a late
// release can never remove capacity owned by a newer request.
export const CUSTOM_WIDGET_REQUEST_CONCURRENCY_TTL_MS = 60_000;
export const CUSTOM_WIDGET_USER_ITEM_CONCURRENCY_LIMIT = 4;
export const CUSTOM_WIDGET_DEFINITION_CONCURRENCY_LIMIT = 8;
const CATEGORY_LIMITS = { query: 60, action: 10, delete: 3 } as const;
const DEFINITION_CATEGORY_LIMITS = { query: 240, action: 40, delete: 12 } as const;
type RequestCategory = keyof typeof CATEGORY_LIMITS;

export interface RequestLimitInput {
  category: RequestCategory;
  userId?: string;
  anonymousId?: string;
  itemId: string;
  definitionId: string;
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
    const identity = input.userId ? `user:${input.userId}` : `anonymous:${input.anonymousId ?? "unknown"}`;
    const rateKey = `custom-widget:rate:${input.category}:${hashKey(identity, input.itemId)}`;
    const definitionRateKey = `custom-widget:rate:v2:definition:${input.category}:${hashKey(input.definitionId)}`;
    const userKey = `custom-widget:concurrency:v2:user-item:${hashKey(identity, input.itemId)}`;
    const definitionKey = `custom-widget:concurrency:v2:definition:${hashKey(input.definitionId)}`;
    if (!this.options.store)
      return this.acquireLocal(rateKey, definitionRateKey, userKey, definitionKey, input.category);
    try {
      return await this.acquireStored(
        rateKey,
        definitionRateKey,
        userKey,
        definitionKey,
        input.category,
        this.options.store,
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
  ) {
    const now = Date.now();
    this.acquireLocalRate(rateKey, CATEGORY_LIMITS[category], now);
    this.acquireLocalRate(definitionRateKey, DEFINITION_CATEGORY_LIMITS[category], now);
    this.acquireLocalConcurrency(userKey, CUSTOM_WIDGET_USER_ITEM_CONCURRENCY_LIMIT);
    try {
      this.acquireLocalConcurrency(definitionKey, CUSTOM_WIDGET_DEFINITION_CONCURRENCY_LIMIT);
    } catch (error) {
      this.releaseLocalConcurrency(userKey);
      throw error;
    }
    return async () => {
      this.releaseLocalConcurrency(userKey);
      this.releaseLocalConcurrency(definitionKey);
    };
  }

  private async acquireStored(
    rateKey: string,
    definitionRateKey: string,
    userKey: string,
    definitionKey: string,
    category: RequestCategory,
    store: RequestLimitStore,
  ) {
    const ownerId = randomUUID();
    const rate = await store.incrementRate(rateKey, WINDOW_MS);
    if (rate.count > CATEGORY_LIMITS[category]) throwLimit(rate.retryAfterMs);
    const definitionRate = await store.incrementRate(definitionRateKey, WINDOW_MS);
    if (definitionRate.count > DEFINITION_CATEGORY_LIMITS[category]) throwLimit(definitionRate.retryAfterMs);
    if (
      !(await store.acquireConcurrency(
        userKey,
        ownerId,
        CUSTOM_WIDGET_USER_ITEM_CONCURRENCY_LIMIT,
        CUSTOM_WIDGET_REQUEST_CONCURRENCY_TTL_MS,
      ))
    ) {
      throwLimit(1_000);
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
        throwLimit(1_000);
      }
    } catch (error) {
      await store.releaseConcurrency(userKey, ownerId);
      throw error;
    }
    return async () => {
      await Promise.all([store.releaseConcurrency(userKey, ownerId), store.releaseConcurrency(definitionKey, ownerId)]);
    };
  }

  private acquireLocalRate(key: string, limit: number, now: number): void {
    const recent = (this.rateBuckets.get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
    if (recent.length >= limit) throwLimit(WINDOW_MS - (now - (recent[0] ?? now)));
    recent.push(now);
    this.rateBuckets.set(key, recent);
  }

  private acquireLocalConcurrency(key: string, limit: number): void {
    const count = this.concurrency.get(key) ?? 0;
    if (count >= limit) throwLimit(1_000);
    this.concurrency.set(key, count + 1);
  }

  private releaseLocalConcurrency(key: string): void {
    const count = this.concurrency.get(key) ?? 0;
    if (count <= 1) this.concurrency.delete(key);
    else this.concurrency.set(key, count - 1);
  }
}

const hashKey = (...parts: string[]) => createHash("sha256").update(parts.join("\0")).digest("hex");
const throwLimit = (retryAfterMs: number): never => {
  throw new CustomWidgetDomainError({
    code: "TOO_MANY_REQUESTS",
    message: "Custom widget request limit exceeded",
    retryAfterMs: Math.max(1, retryAfterMs),
  });
};
