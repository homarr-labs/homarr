// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";

import { locationRouter } from "../location";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: mocks.fetch,
}));

vi.mock("@homarr/core/infrastructure/http/timeout", () => ({
  withTimeoutAsync: async (callback: (signal: AbortSignal) => Promise<Response>) =>
    await callback(new AbortController().signal),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ results: [] })));
});

describe("locationRouter", () => {
  test("encodes the complete search text as one name parameter", async () => {
    const caller = locationRouter.createCaller({ db: createDb(), deviceType: undefined, session: null });

    await caller.searchCity({ query: "Paris&language=xx&token=secret" });

    const requestedUrl = new URL(mocks.fetch.mock.calls[0]?.[0] as string);
    expect(requestedUrl.searchParams.get("name")).toBe("Paris&language=xx&token=secret");
    expect(requestedUrl.searchParams.has("language")).toBe(false);
    expect(requestedUrl.searchParams.has("token")).toBe(false);
  });
});
