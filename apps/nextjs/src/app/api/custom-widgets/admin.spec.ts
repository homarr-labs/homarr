// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  env: { CUSTOM_WIDGETS_ENABLED: true },
}));

vi.mock("@homarr/auth/next", () => ({ auth: mocks.auth }));
vi.mock("~/env", () => ({ env: mocks.env }));

import { requireCustomWidgetAdmin } from "./admin";

beforeEach(() => {
  mocks.env.CUSTOM_WIDGETS_ENABLED = true;
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

  test("returns an unavailable response when the emergency switch is off", async () => {
    mocks.env.CUSTOM_WIDGETS_ENABLED = false;
    const response = await requireCustomWidgetAdmin();
    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toMatchObject({ error: expect.stringContaining("temporarily disabled") });
  });
});
