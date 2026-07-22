import { createHash, randomUUID } from "node:crypto";

import { CustomWidgetDomainError } from "./errors";

const WINDOW_MS = 60_000;
// A query may legally follow three redirects with a ten-second timeout per hop.
// Keep the lease above that total and identify every acquisition so a late
// release can never remove capacity owned by a newer request.
export const CUSTOM_WIDGET_REQUEST_CONCURRENCY_TTL_MS = 60_000;
const CATEGORY_LIMITS = { query: 60, action: 10, delete: 3 } as const;
type RequestCategory = keyof typeof CATEGORY_LIMITS;

export interface RequestLimitInput {
  category: RequestCategory;
  userId?: string;
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
    const identity = input.userId ?? "anonymous";
    const rateKey = `custom-widget:rate:${input.category}:${hashKey(identity, input.itemId)}`;
    const userKey = `custom-widget:concurrency:v2:user-item:${hashKey(identity, input.itemId)}`;
    const definitionKey = `custom-widget:concurrency:v2:definition:${hashKey(input.definitionId)}`;
    if (!this.options.store) return this.acquireLocal(rateKey, userKey, definitionKey, input.category);
    try {
      return await this.acquireStored(rateKey, userKey, definitionKey, input.category, this.options.store);
    } catch (error) {
      if (error instanceof CustomWidgetDomainError) throw error;
      this.options.onStoreError?.(error);
      throw new CustomWidgetDomainError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Request limiter is unavailable",
        cause: error,
      });
    }
  }

  private acquireLocal(rateKey: string, userKey: string, definitionKey: string, category: RequestCategory) {
    const now = Date.now();
    const recent = (this.rateBuckets.get(rateKey) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
    if (recent.length >= CATEGORY_LIMITS[category]) throwLimit(WINDOW_MS - (now - (recent[0] ?? now)));
    recent.push(now);
    this.rateBuckets.set(rateKey, recent);
    this.acquireLocalConcurrency(userKey, 4);
    try {
      this.acquireLocalConcurrency(definitionKey, 8);
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
    userKey: string,
    definitionKey: string,
    category: RequestCategory,
    store: RequestLimitStore,
  ) {
    const ownerId = randomUUID();
    const rate = await store.incrementRate(rateKey, WINDOW_MS);
    if (rate.count > CATEGORY_LIMITS[category]) throwLimit(rate.retryAfterMs);
    if (!(await store.acquireConcurrency(userKey, ownerId, 4, CUSTOM_WIDGET_REQUEST_CONCURRENCY_TTL_MS))) {
      throwLimit(1_000);
    }
    try {
      if (!(await store.acquireConcurrency(definitionKey, ownerId, 8, CUSTOM_WIDGET_REQUEST_CONCURRENCY_TTL_MS))) {
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
