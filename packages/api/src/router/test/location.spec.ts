import { afterEach, describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";

const mocks = vi.hoisted(() => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
  env: { NO_EXTERNAL_CONNECTION: false },
}));

vi.mock("@homarr/common/env", () => ({
  env: mocks.env,
}));

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: mocks.fetchWithTrustedCertificatesAsync,
}));

vi.mock("@homarr/core/infrastructure/http/timeout", () => ({
  withTimeoutAsync: async (callback: (signal: AbortSignal) => Promise<Response>) => {
    return await callback(new AbortController().signal);
  },
}));

import { locationRouter } from "../location";

const createJsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

const createCaller = () => locationRouter.createCaller({ db: createDb(), deviceType: undefined, session: null });

afterEach(() => {
  mocks.env.NO_EXTERNAL_CONNECTION = false;
  mocks.fetchWithTrustedCertificatesAsync.mockReset();
});

describe("locationRouter.searchCity", () => {
  test("should return empty results when external connections are disabled", async () => {
    // Arrange
    mocks.env.NO_EXTERNAL_CONNECTION = true;
    const caller = createCaller();

    // Act
    const result = await caller.searchCity({ query: "Paris" });

    // Assert
    expect(result.results).toEqual([]);
    expect(mocks.fetchWithTrustedCertificatesAsync).not.toHaveBeenCalled();
  });

  test("should fetch the geocoding API when external connections are enabled", async () => {
    // Arrange
    mocks.env.NO_EXTERNAL_CONNECTION = false;
    mocks.fetchWithTrustedCertificatesAsync.mockResolvedValue(
      createJsonResponse({
        results: [
          {
            id: 1,
            name: "Paris",
            country: "France",
            country_code: "FR",
            latitude: 48.85341,
            longitude: 2.3488,
            population: 2138551,
          },
        ],
      }),
    );
    const caller = createCaller();

    // Act
    const result = await caller.searchCity({ query: "Paris" });

    // Assert
    expect(result.results[0]?.name).toBe("Paris");
    expect(mocks.fetchWithTrustedCertificatesAsync).toHaveBeenCalledWith(
      expect.stringContaining("geocoding-api.open-meteo.com"),
      expect.anything(),
    );
  });
});
