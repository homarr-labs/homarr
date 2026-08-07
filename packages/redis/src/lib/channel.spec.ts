// @vitest-environment node

import { describe, expect, test, vi } from "vitest";

vi.mock("./connection", () => ({
  createRedisConnection: () => null,
}));

import { createLockChannel } from "./channel";

describe("createLockChannel", () => {
  test("degrades gracefully when Redis connections are disabled", async () => {
    const lock = createLockChannel("test-lock");

    const token = await lock.acquireAsync(60);

    expect(token).toEqual(expect.any(String));
    if (!token) throw new Error("Expected the fallback lock to return a token");
    await expect(lock.releaseAsync(token)).resolves.toBeUndefined();
  });
});
