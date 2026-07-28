// @vitest-environment node

import { describe, expect, test, vi } from "vitest";

import { createRequestHandler } from "./request-handler";

describe("createRequestHandler", () => {
  test("keeps the standard result contract free of cache provenance", async () => {
    const requestHandler = createRequestHandler({
      requestAsync: vi.fn().mockResolvedValue("current"),
    });

    const result = await requestHandler.handler({ integrationId: "first" }).getDataAsync();

    expect(result).toMatchObject({ data: "current", timestamp: expect.any(Date) });
    expect(result).not.toHaveProperty("isStale");
  });

  test("marks an expired cache fallback as stale while preserving its timestamp", async () => {
    const requestAsync = vi.fn().mockResolvedValueOnce("cached").mockRejectedValueOnce(new Error("offline"));
    const requestHandler = createRequestHandler({
      requestAsync,
      cacheTtlMs: 0,
      fallbackToStaleOnError: true,
    });
    const handler = requestHandler.handler({ integrationId: "first" });

    const fresh = await handler.getDataWithProvenanceAsync();
    const fallback = await handler.getDataWithProvenanceAsync();

    expect(fresh).toMatchObject({ data: "cached", isStale: false });
    expect(fallback).toEqual({
      data: "cached",
      timestamp: fresh.timestamp,
      isStale: true,
    });
    expect(requestAsync).toHaveBeenCalledTimes(2);
  });

  test("does not hide an initial error when no cache exists", async () => {
    const requestHandler = createRequestHandler({
      requestAsync: vi.fn().mockRejectedValue(new Error("offline")),
      fallbackToStaleOnError: true,
    });

    await expect(requestHandler.handler({ integrationId: "first" }).getDataWithProvenanceAsync()).rejects.toThrow(
      "offline",
    );
  });
});
