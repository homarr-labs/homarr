import { describe, expect, it, vi } from "vitest";

import {
  CUSTOM_WIDGET_REQUEST_CONCURRENCY_TTL_MS,
  CustomWidgetRequestLimiter,
  MAX_REQUEST_DURATION_MS,
} from "../server";
import type { RequestLimitStore } from "../server";

const input = { category: "action", userId: "user", itemId: "item", definitionId: "definition" } as const;

describe("custom widget request limits", () => {
  it("keeps owned concurrency leases beyond the total request deadline", () => {
    expect(CUSTOM_WIDGET_REQUEST_CONCURRENCY_TTL_MS).toBeGreaterThan(MAX_REQUEST_DURATION_MS);
  });

  it("enforces local per-user/item concurrency and releases capacity", async () => {
    const limiter = new CustomWidgetRequestLimiter();
    const releases = await Promise.all(Array.from({ length: 4 }, () => limiter.acquire(input)));
    await expect(limiter.acquire(input)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS", retryAfterMs: 1_000 });
    await releases[0]?.();
    await expect(limiter.acquire(input)).resolves.toBeTypeOf("function");
    await Promise.all(releases.slice(1).map((release) => release()));
  });

  it("keeps anonymous client concurrency buckets independent", async () => {
    const limiter = new CustomWidgetRequestLimiter();
    const firstClient = { ...input, userId: undefined, anonymousId: "198.51.100.10" };
    const secondClient = { ...input, userId: undefined, anonymousId: "198.51.100.11" };
    const firstClientReleases = await Promise.all(Array.from({ length: 4 }, () => limiter.acquire(firstClient)));

    await expect(limiter.acquire(firstClient)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    const releaseSecondClient = await limiter.acquire(secondClient);

    await releaseSecondClient();
    await Promise.all(firstClientReleases.map((release) => release()));
  });

  it("enforces an identity-independent per-definition rate bucket", async () => {
    const anonymousQuery = { ...input, category: "query" as const, userId: undefined };
    let increment = 0;
    const store: RequestLimitStore = {
      incrementRate: vi.fn(async () => {
        increment += 1;
        return {
          // Each acquisition increments its identity bucket first and its
          // definition bucket second. Simulate a fresh forged identity while
          // the shared definition bucket is already exhausted.
          count: increment === 4 ? 241 : 1,
          retryAfterMs: 456,
        };
      }),
      acquireConcurrency: vi.fn(async () => true),
      releaseConcurrency: vi.fn(async () => undefined),
    };
    const limiter = new CustomWidgetRequestLimiter({ store });
    const release = await limiter.acquire({ ...anonymousQuery, anonymousId: "198.51.100.10" });
    await release();

    await expect(limiter.acquire({ ...anonymousQuery, anonymousId: "203.0.113.20" })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      retryAfterMs: 456,
    });

    const incrementRate = vi.mocked(store.incrementRate);
    expect(incrementRate.mock.calls[0]?.[0]).not.toBe(incrementRate.mock.calls[2]?.[0]);
    expect(incrementRate.mock.calls[1]?.[0]).toBe(incrementRate.mock.calls[3]?.[0]);
    expect(store.acquireConcurrency).toHaveBeenCalledTimes(2);
  });

  it("enforces category limits and exposes retry metadata", async () => {
    const store: RequestLimitStore = {
      incrementRate: vi.fn(async () => ({ count: 11, retryAfterMs: 321 })),
      acquireConcurrency: vi.fn(async () => true),
      releaseConcurrency: vi.fn(async () => undefined),
    };
    await expect(new CustomWidgetRequestLimiter({ store }).acquire(input)).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      retryAfterMs: 321,
    });
    expect(store.acquireConcurrency).not.toHaveBeenCalled();
  });

  it("releases user capacity when definition capacity cannot be acquired", async () => {
    const store: RequestLimitStore = {
      incrementRate: vi.fn(async () => ({ count: 1, retryAfterMs: 60_000 })),
      acquireConcurrency: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
      releaseConcurrency: vi.fn(async () => undefined),
    };
    await expect(new CustomWidgetRequestLimiter({ store }).acquire(input)).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(store.releaseConcurrency).toHaveBeenCalledOnce();
  });

  it("releases only the concurrency lease owned by the request", async () => {
    const owners = new Set<string>();
    const store: RequestLimitStore = {
      incrementRate: vi.fn(async () => ({ count: 1, retryAfterMs: 60_000 })),
      acquireConcurrency: vi.fn(async (_key, ownerId) => {
        owners.add(ownerId);
        return true;
      }),
      releaseConcurrency: vi.fn(async (_key, ownerId) => {
        owners.delete(ownerId);
      }),
    };
    const releaseFirst = await new CustomWidgetRequestLimiter({ store }).acquire(input);
    const firstOwner = [...owners][0];
    expect(store.acquireConcurrency).toHaveBeenCalledWith(
      expect.any(String),
      firstOwner,
      expect.any(Number),
      CUSTOM_WIDGET_REQUEST_CONCURRENCY_TTL_MS,
    );
    await releaseFirst();

    expect(firstOwner).toBeTypeOf("string");
    expect(store.releaseConcurrency).toHaveBeenCalledWith(expect.any(String), firstOwner);
    expect(owners).not.toContain(firstOwner);
  });
});
