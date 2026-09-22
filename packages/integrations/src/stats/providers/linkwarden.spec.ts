import { afterEach, describe, expect, test, vi } from "vitest";

import { createStatsRequestSignal } from "../types";
import { linkwardenStatsProvider } from "./linkwarden";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Linkwarden statistics", () => {
  test("keeps collection metrics when tag pagination reaches the provider deadline", async () => {
    const originalTimeout = AbortSignal.timeout;
    vi.spyOn(AbortSignal, "timeout").mockImplementation((milliseconds) => {
      if (milliseconds === 30_000) return originalTimeout(10);
      return originalTimeout(milliseconds);
    });
    const sourceController = new AbortController();
    const providerSignal = createStatsRequestSignal(sourceController.signal);

    const result = await linkwardenStatsProvider.fetchAsync({
      signal: providerSignal,
      secret: () => "token",
      hasSecret: () => true,
      requestAsync: async (path) => {
        if (path === "/api/v1/collections") return [{ _count: { links: 4 } }];
        if (path === "/api/v1/tags") return { data: { tags: [{}], nextCursor: 1 } };
        return await new Promise<never>((_resolve, reject) => {
          providerSignal.addEventListener("abort", () => reject(providerSignal.reason), { once: true });
        });
      },
    });

    expect(sourceController.signal.aborted).toBe(false);
    expect(result).toEqual({ values: { links: 4, collections: 1 }, unavailableMetrics: ["tags"] });
  });
});
