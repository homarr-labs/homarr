// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
}));

vi.mock("@homarr/auth/next", () => ({ auth: mocks.auth }));

import { adminRoute } from "./admin";

beforeEach(() => {
  mocks.auth.mockResolvedValue({ user: { permissions: ["admin"] } });
});

describe("Custom Widget HTTP resource access", () => {
  test("allows authenticated administrators", async () => {
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const response = await adminRoute(handler)();

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  test.each([
    ["anonymous users", null],
    ["authenticated non-admins", { user: { permissions: ["board-modify-all"] } }],
  ])("denies %s", async (_label, session) => {
    mocks.auth.mockResolvedValue(session);
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const response = await adminRoute(handler)();

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
});
