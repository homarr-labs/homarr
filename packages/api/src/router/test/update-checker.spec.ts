import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import type { Database } from "@homarr/db";
import type { GroupPermissionKey } from "@homarr/definitions";

import { updateCheckerRouter } from "../update-checker";

const mocks = vi.hoisted(() => ({
  getDataAsync: vi.fn(async () => ({
    data: { availableUpdates: [{ tagName: "v99.0.0" }] },
    timestamp: new Date(),
  })),
}));

vi.mock("@homarr/request-handler/update-checker", () => ({
  updateCheckerRequestHandler: {
    handler: () => ({ getDataAsync: mocks.getDataAsync }),
  },
}));

const createSession = (permissions: GroupPermissionKey[]): Session => ({
  user: {
    id: "user",
    permissions,
    colorScheme: "light",
  },
  expires: new Date().toISOString(),
});

const createCaller = (session: Session | null) =>
  updateCheckerRouter.createCaller({
    db: null as unknown as Database,
    deviceType: undefined,
    session,
  });

describe("update checker authorization", () => {
  test("allows administrators to read the cached result", async () => {
    await expect(createCaller(createSession(["admin"])).getAvailableUpdates()).resolves.toEqual([
      { tagName: "v99.0.0" },
    ]);
  });

  test("rejects authenticated users without admin permission", async () => {
    await expect(createCaller(createSession([])).getAvailableUpdates()).rejects.toThrow("Permission denied");
  });

  test("rejects anonymous users", async () => {
    await expect(createCaller(null).getAvailableUpdates()).rejects.toThrow("UNAUTHORIZED");
  });

  test("returns an empty result when the cache reader fails", async () => {
    mocks.getDataAsync.mockRejectedValueOnce(new Error("Redis unavailable"));

    await expect(createCaller(createSession(["admin"])).getAvailableUpdates()).resolves.toEqual([]);
  });
});
