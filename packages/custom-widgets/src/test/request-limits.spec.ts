import { describe, expect, it, vi } from "vitest";

import { CustomWidgetRequestLimiter } from "../server";
import type { RequestLimitStore } from "../server";

const input = { category: "action", userId: "user", itemId: "item", definitionId: "definition" } as const;

describe("custom widget request limits", () => {
  it("enforces local per-user/item concurrency and releases capacity", async () => {
    const limiter = new CustomWidgetRequestLimiter();
    const releases = await Promise.all(Array.from({ length: 4 }, () => limiter.acquire(input)));
    await expect(limiter.acquire(input)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS", retryAfterMs: 1_000 });
    await releases[0]?.();
    await expect(limiter.acquire(input)).resolves.toBeTypeOf("function");
    await Promise.all(releases.slice(1).map((release) => release()));
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
});
