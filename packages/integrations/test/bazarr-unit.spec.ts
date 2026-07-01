// @vitest-environment node

import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationSecret } from "../src/base/types";
import { BazarrIntegration } from "../src/bazarr/bazarr-integration";

vi.mock("@homarr/db", async (importActual) => {
  const actual = await importActual<typeof import("@homarr/db")>();
  return { ...actual, db: createDb() };
});

vi.mock("@homarr/core/infrastructure/certificates", async (importActual) => {
  const actual = await importActual<typeof import("@homarr/core/infrastructure/certificates")>();
  return {
    ...actual,
    getTrustedCertificateHostnamesAsync: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const TEST_URL = "https://bazarr.example.com";
const API_KEY = "test-api-key";

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const createIntegration = (decryptedSecrets: IntegrationSecret[] = [{ kind: "apiKey", value: API_KEY }]) =>
  new BazarrIntegration({
    id: "test-bazarr",
    name: "Test Bazarr",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets,
  });

beforeEach(() => {
  mockFetch.mockReset();
});

describe("BazarrIntegration getBadgesAsync", () => {
  test("maps badge counts from the Bazarr API", async () => {
    mockFetch.mockImplementation(
      () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              episodes: 12,
              movies: 4,
              providers: 1,
              status: 2,
              sonarr_signalr: "LIVE",
              radarr_signalr: "",
              announcements: 0,
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          ),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>,
    );

    const badges = await createIntegration().getBadgesAsync();

    expect(badges).toStrictEqual({
      episodes: 12,
      movies: 4,
      providers: 1,
      status: 2,
      sonarr_signalr: "LIVE",
      radarr_signalr: "",
      announcements: 0,
    });
  });

  test("sends the API key in the X-API-KEY header", async () => {
    mockFetch.mockImplementation(
      () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              episodes: 0,
              movies: 0,
              providers: 0,
              status: 0,
              sonarr_signalr: "",
              radarr_signalr: "",
              announcements: 0,
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          ),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>,
    );

    await createIntegration().getBadgesAsync();

    const [, requestInit] = mockFetch.mock.calls[0] ?? [];
    expect(requestInit?.headers).toMatchObject({ "X-API-KEY": API_KEY });
  });
});
