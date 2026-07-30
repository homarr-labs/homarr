// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
}));

vi.mock("@homarr/auth/next", () => ({ auth: mocks.auth }));

import { requireCustomWidgetAdmin } from "./admin";

beforeEach(() => {
  mocks.auth.mockResolvedValue({ user: { permissions: ["admin"] } });
});

describe("Custom Widget HTTP resource access", () => {
  test("allows authenticated administrators", async () => {
    await expect(requireCustomWidgetAdmin()).resolves.toBeNull();
  });

  test.each([
    ["anonymous users", null],
    ["authenticated non-admins", { user: { permissions: ["board-modify-all"] } }],
  ])("denies %s", async (_label, session) => {
    mocks.auth.mockResolvedValue(session);
    const response = await requireCustomWidgetAdmin();
    expect(response?.status).toBe(403);
  });
});
