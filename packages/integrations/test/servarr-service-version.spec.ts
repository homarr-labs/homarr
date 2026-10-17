// @vitest-environment node

import { describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { BinderyIntegration } from "../src/media-organizer/bindery/bindery-integration";
import { LidarrIntegration } from "../src/media-organizer/lidarr/lidarr-integration";
import { RadarrIntegration } from "../src/media-organizer/radarr/radarr-integration";
import { ReadarrIntegration } from "../src/media-organizer/readarr/readarr-integration";
import { SonarrIntegration } from "../src/media-organizer/sonarr/sonarr-integration";
import { ProwlarrIntegration } from "../src/prowlarr/prowlarr-integration";

vi.mock("@homarr/db", async (importActual) => ({
  ...(await importActual<Record<string, unknown>>()),
  db: createDb(),
}));

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const integrationInput = {
  id: "test-servarr",
  name: "Servarr",
  url: "http://localhost:8989",
  decryptedSecrets: [{ kind: "apiKey" as const, value: "test-key" }],
  externalUrl: null,
};

// Bindery authenticates its own requests with "X-Api-Key"; the others use the shared apiKeyAuth header.
const servarrIntegrations = [
  {
    name: "Sonarr",
    create: () => new SonarrIntegration(integrationInput),
    path: "/api/v3/system/status",
    header: "X-API-Key",
  },
  {
    name: "Radarr",
    create: () => new RadarrIntegration(integrationInput),
    path: "/api/v3/system/status",
    header: "X-API-Key",
  },
  {
    name: "Lidarr",
    create: () => new LidarrIntegration(integrationInput),
    path: "/api/v1/system/status",
    header: "X-API-Key",
  },
  {
    name: "Readarr",
    create: () => new ReadarrIntegration(integrationInput),
    path: "/api/v1/system/status",
    header: "X-API-Key",
  },
  {
    name: "Prowlarr",
    create: () => new ProwlarrIntegration(integrationInput),
    path: "/api/v1/system/status",
    header: "X-API-Key",
  },
  {
    name: "Bindery",
    create: () => new BinderyIntegration(integrationInput),
    path: "/api/v1/system/status",
    header: "X-Api-Key",
  },
];

describe("Servarr getServiceVersionAsync", () => {
  test.each(servarrIntegrations)(
    "$name requests $path and returns the running version",
    async ({ create, path, header }) => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ version: "4.0.20.3014" }) } as never);

      const result = await create().getServiceVersionAsync();

      expect(result).toEqual({ version: "4.0.20.3014" });
      const [calledUrl, calledOptions] = mockFetch.mock.calls[0] as [URL, { headers: Record<string, string> }];
      expect(calledUrl.toString()).toBe(`http://localhost:8989${path}`);
      expect(calledOptions).toEqual({ headers: { [header]: "test-key" } });
    },
  );

  test.each(servarrIntegrations)("$name rejects when the status request fails", async ({ create }) => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, url: "http://localhost:8989" } as never);

    await expect(create().getServiceVersionAsync()).rejects.toThrow();
  });

  test.each(servarrIntegrations)("$name rejects when the response has no version", async ({ create }) => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ appName: "Servarr" }) } as never);

    await expect(create().getServiceVersionAsync()).rejects.toThrow();
  });
});
