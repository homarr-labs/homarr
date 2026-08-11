// @vitest-environment node

import { describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { SonarrIntegration } from "../src/media-organizer/sonarr/sonarr-integration";
import { SportarrIntegration } from "../src/media-organizer/sportarr/sportarr-integration";

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

const calendarEventResponse = [
  {
    title: "Test Event",
    airDateUtc: "2026-01-01T00:00:00Z",
    seasonNumber: 1,
    episodeNumber: 1,
    images: [],
    series: {
      title: "Test League",
      titleSlug: "test-league",
      images: [],
    },
  },
];

const createCalendarEventWithPoster = (seasonNumber: number, episodeNumber: number) => [
  {
    title: "Test Event",
    airDateUtc: "2026-01-01T00:00:00Z",
    seasonNumber,
    episodeNumber,
    images: [{ coverType: "poster", remoteUrl: "https://example.com/event-poster.jpg" }],
    series: {
      title: "Test League",
      titleSlug: "test-league",
      images: [],
    },
  },
];

const sportarrIntegrationInput = {
  id: "test-sportarr",
  name: "Sportarr",
  url: "http://localhost:1867",
  decryptedSecrets: [{ kind: "apiKey" as const, value: "test-key" }],
  externalUrl: null,
};

describe("SportarrIntegration branding override", () => {
  test("uses Sportarr name and logo instead of Sonarr's on calendar links", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(calendarEventResponse),
    } as never);

    const integration = new SportarrIntegration(sportarrIntegrationInput);
    const events = await integration.getCalendarEventsAsync(new Date("2026-01-01"), new Date("2026-01-31"));

    expect(events[0]?.links[0]).toMatchObject({
      name: "Sportarr",
      href: "http://localhost:1867/series/test-league",
      logo: "/images/apps/sportarr.svg",
    });
  });

  test("does not affect SonarrIntegration's own branding", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(calendarEventResponse),
    } as never);

    const integration = new SonarrIntegration({
      ...sportarrIntegrationInput,
      id: "test-sonarr",
      name: "Sonarr",
      url: "http://localhost:8989",
    });
    const events = await integration.getCalendarEventsAsync(new Date("2026-01-01"), new Date("2026-01-31"));

    expect(events[0]?.links[0]).toMatchObject({
      name: "Sonarr",
      logo: "/images/apps/sonarr.svg",
    });
  });

  test("shortens the calendar badge to the episode number because seasons are years", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createCalendarEventWithPoster(2026, 43)),
    } as never);

    const integration = new SportarrIntegration(sportarrIntegrationInput);
    const events = await integration.getCalendarEventsAsync(new Date("2026-01-01"), new Date("2026-01-31"));

    expect(events[0]?.image?.badge?.content).toBe("E43");
  });

  test("does not affect SonarrIntegration's own calendar badge format", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(createCalendarEventWithPoster(1, 2)),
    } as never);

    const integration = new SonarrIntegration({
      ...sportarrIntegrationInput,
      id: "test-sonarr",
      name: "Sonarr",
      url: "http://localhost:8989",
    });
    const events = await integration.getCalendarEventsAsync(new Date("2026-01-01"), new Date("2026-01-31"));

    expect(events[0]?.image?.badge?.content).toBe("S1/E2");
  });
});
