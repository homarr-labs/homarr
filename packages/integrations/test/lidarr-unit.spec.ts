// @vitest-environment node

import { describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { LidarrIntegration } from "../src/media-organizer/lidarr/lidarr-integration";

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

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const integrationInput = {
  id: "test-lidarr",
  name: "Lidarr",
  url: "http://localhost:8686",
  decryptedSecrets: [{ kind: "apiKey" as const, value: "test-key" }],
  externalUrl: null,
};

describe("LidarrIntegration calendar", () => {
  test("includes Lidarr artist link in calendar events", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            title: "Test Album",
            overview: "Overview",
            images: [],
            artist: {
              artistName: "Test Artist",
              titleSlug: "test-artist",
              links: [{ name: "last", url: "https://last.fm/music/Test+Artist" }],
            },
            releaseDate: "2026-01-01T00:00:00Z",
          },
        ]),
    } as never);

    const integration = new LidarrIntegration(integrationInput);
    const events = await integration.getCalendarEventsAsync(new Date("2026-01-01"), new Date("2026-01-31"));

    expect(events[0]?.links[0]).toMatchObject({
      name: "Lidarr",
      href: "http://localhost:8686/artist/test-artist",
      logo: "/images/apps/lidarr.svg",
    });
    // The existing external artist link must survive the Lidarr-link prepend.
    expect(events[0]?.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "LastFM",
          href: "https://last.fm/music/Test+Artist",
          logo: "/images/apps/lastfm.svg",
        }),
      ]),
    );
  });
});
