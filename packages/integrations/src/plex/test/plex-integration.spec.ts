// @vitest-environment node
import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationSecret } from "../../base/types";
import { PlexIntegration } from "../plex-integration";

const imageProxyMocks = vi.hoisted(() => ({
  createImageAsync: vi.fn((url: string) => Promise.resolve(`proxied:${url}`)),
}));

const dispatcherMocks = vi.hoisted(() => ({ close: vi.fn(() => Promise.resolve()) }));

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
  createCertificateAgentAsync: vi.fn(() => Promise.resolve(dispatcherMocks)),
}));

vi.mock("@homarr/image-proxy", () => ({
  ImageProxy: class {
    createImageAsync = imageProxyMocks.createImageAsync;
  },
}));

const TEST_URL = "https://plex.example.com";
const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const secrets: IntegrationSecret[] = [{ kind: "apiKey", value: "plex-token" }];

const createIntegration = () =>
  new PlexIntegration({
    id: "test-plex",
    name: "Test Plex",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets: secrets,
  });

const createMetadataItem = (key: string, overrides: Record<string, unknown>) => ({
  key: `/library/metadata/${key}`,
  type: "movie",
  title: "Movie",
  addedAt: 1_735_689_600,
  Image: [
    {
      type: "coverPoster",
      url: `/library/metadata/${key}/thumb`,
    },
  ],
  ...overrides,
});

const createEpisode = (key: string, overrides: Record<string, unknown>) => ({
  key: `/library/metadata/${key}`,
  type: "episode",
  title: "Episode",
  addedAt: 1_735_689_600,
  ...overrides,
});

const respond = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status })) as unknown as ReturnType<
    typeof fetchWithTrustedCertificatesAsync
  >;

beforeEach(() => {
  mockFetch.mockReset();
  imageProxyMocks.createImageAsync.mockClear();
});

describe("PlexIntegration.getMediaReleasesAsync", () => {
  test("uses the series title for TV seasons and episodes", async () => {
    mockFetch.mockImplementation((url) => {
      const urlString = String(url);

      if (urlString.endsWith("/identity")) {
        return Promise.resolve(
          new Response(JSON.stringify({ MediaContainer: { machineIdentifier: "server-id" } }), { status: 200 }),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }

      if (urlString.endsWith("/library/recentlyAdded")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              MediaContainer: {
                Metadata: [
                  createMetadataItem("season", {
                    type: "season",
                    title: "Season 1",
                    parentTitle: "Breaking Bad",
                  }),
                  createMetadataItem("episode", {
                    type: "episode",
                    title: "Review",
                    parentTitle: "Season 1",
                    grandparentTitle: "The Bear",
                  }),
                  createMetadataItem("movie", {
                    type: "movie",
                    title: "Inception",
                    tagline: "Dreams feel real",
                  }),
                  createMetadataItem("show", {
                    type: "show",
                    title: "The Last of Us",
                    tagline: "A series tagline",
                  }),
                  createMetadataItem("missing-parent", {
                    type: "season",
                    title: "Season 3",
                  }),
                ],
              },
            }),
            { status: 200 },
          ),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }

      throw new Error(`Unexpected Plex request: ${urlString}`);
    });

    const releases = await createIntegration().getMediaReleasesAsync();

    expect(releases).toMatchObject([
      {
        title: "Breaking Bad",
        subtitle: "Season 1",
        type: "tv",
      },
      {
        title: "The Bear",
        subtitle: "Review",
        type: "tv",
      },
      {
        title: "Inception",
        subtitle: "Dreams feel real",
        type: "movie",
      },
      {
        title: "The Last of Us",
        subtitle: "A series tagline",
        type: "tv",
      },
      {
        title: "Season 3",
        subtitle: undefined,
        type: "tv",
      },
    ]);
  });
});

describe("PlexIntegration.getMediaReleasesAsync with recently added episodes", () => {
  const mockPlex = (
    recentlyAdded: Record<string, unknown>[],
    episodesBySection: Record<string, Record<string, unknown>[] | "error">,
  ) => {
    mockFetch.mockImplementation((url) => {
      const urlString = String(url);

      if (urlString.endsWith("/identity")) {
        return respond({ MediaContainer: { machineIdentifier: "server-id" } });
      }

      if (urlString.endsWith("/library/recentlyAdded")) {
        return respond({ MediaContainer: { Metadata: recentlyAdded } });
      }

      if (urlString.endsWith("/library/sections")) {
        return respond({
          MediaContainer: {
            Directory: [
              { key: "2", type: "movie" },
              ...Object.keys(episodesBySection).map((key) => ({ key, type: "show" })),
            ],
          },
        });
      }

      const sectionMatch = /\/library\/sections\/(\d+)\/all\?type=4&sort=addedAt:desc/.exec(urlString);
      if (sectionMatch?.[1] && sectionMatch[1] in episodesBySection) {
        const episodes = episodesBySection[sectionMatch[1]];
        return episodes === "error"
          ? respond({ error: "boom" }, 500)
          : respond({ MediaContainer: { Metadata: episodes } });
      }

      throw new Error(`Unexpected Plex request: ${urlString}`);
    });
  };

  test("bumps seasons that received new episodes and re-creates seasons missing from recentlyAdded", async () => {
    mockPlex(
      [
        createMetadataItem("movie", { type: "movie", title: "Inception", addedAt: 300 }),
        createMetadataItem("season-1/children", {
          type: "season",
          title: "Season 1",
          parentTitle: "Breaking Bad",
          addedAt: 200,
          originallyAvailableAt: "2008-01-20",
        }),
        createMetadataItem("season-2/children", {
          type: "season",
          title: "Season 2",
          parentTitle: "Breaking Bad",
          addedAt: 100,
        }),
      ],
      {
        "1": [
          createEpisode("ep-new", {
            parentKey: "/library/metadata/season-1",
            addedAt: 500,
            originallyAvailableAt: "2026-09-14",
          }),
          createEpisode("ep-old", { parentKey: "/library/metadata/season-1", addedAt: 50 }),
        ],
        "7": [
          createEpisode("ep-missing", {
            parentKey: "/library/metadata/season-99",
            parentTitle: "Season 11",
            grandparentTitle: "Futurama",
            grandparentThumb: "/library/metadata/show-99/thumb",
            art: "/library/metadata/ep-missing/art",
            addedAt: 400,
            originallyAvailableAt: "2026-09-13",
          }),
        ],
      },
    );

    const releases = await createIntegration().getMediaReleasesAsync();

    expect(releases.map((release) => [release.title, release.subtitle])).toEqual([
      ["Breaking Bad", "Season 1"],
      ["Futurama", "Season 11"],
      ["Inception", undefined],
      ["Breaking Bad", "Season 2"],
    ]);
    // the bumped season uses the air date of the newest episode, as a local calendar date
    expect(releases[0]?.releaseDate).toEqual(new Date(2026, 8, 14));
    expect(releases[1]).toMatchObject({
      type: "tv",
      releaseDate: new Date(2026, 8, 13),
      imageUrls: {
        poster: `proxied:${TEST_URL}/library/metadata/show-99/thumb`,
        backdrop: `proxied:${TEST_URL}/library/metadata/ep-missing/art`,
      },
      href: `${TEST_URL}/web/index.html#!/server/server-id/details?key=${encodeURIComponent("/library/metadata/season-99")}`,
    });
  });

  test("falls back to recentlyAdded when episodes cannot be fetched", async () => {
    mockFetch.mockImplementation((url) => {
      const urlString = String(url);

      if (urlString.endsWith("/identity")) {
        return Promise.resolve(
          new Response(JSON.stringify({ MediaContainer: { machineIdentifier: "server-id" } }), { status: 200 }),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }

      if (urlString.endsWith("/library/recentlyAdded")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              MediaContainer: {
                Metadata: [
                  createMetadataItem("season/children", {
                    type: "season",
                    title: "Season 1",
                    parentTitle: "Breaking Bad",
                  }),
                ],
              },
            }),
            { status: 200 },
          ),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }

      return Promise.resolve(new Response("Not found", { status: 404 })) as unknown as ReturnType<
        typeof fetchWithTrustedCertificatesAsync
      >;
    });

    const releases = await createIntegration().getMediaReleasesAsync();

    expect(releases).toMatchObject([{ title: "Breaking Bad", subtitle: "Season 1" }]);
  });

  test("does not duplicate content that recentlyAdded already lists as an episode or a show", async () => {
    mockPlex(
      [
        createMetadataItem("episode", {
          type: "episode",
          title: "Oceans Three",
          parentKey: "/library/metadata/season-11",
          grandparentTitle: "Futurama",
          addedAt: 100,
        }),
        createMetadataItem("show-42", { type: "show", title: "Severance", addedAt: 90 }),
      ],
      {
        "1": [
          createEpisode("ep-futurama", {
            title: "Oceans Three",
            index: 5,
            parentIndex: 11,
            parentKey: "/library/metadata/season-11",
            grandparentKey: "/library/metadata/show-futurama",
            grandparentTitle: "Futurama",
            addedAt: 500,
          }),
          createEpisode("ep-severance", {
            title: "Cold Harbor",
            index: 10,
            parentIndex: 2,
            parentKey: "/library/metadata/season-sev-2",
            grandparentKey: "/library/metadata/show-42",
            grandparentTitle: "Severance",
            addedAt: 400,
          }),
        ],
      },
    );

    const releases = await createIntegration().getMediaReleasesAsync();

    // one card per show: the episode entry is bumped and labelled, the show entry is left untouched
    expect(releases.map((release) => [release.title, release.subtitle])).toEqual([
      ["Futurama", "S11E05 \u2013 Oceans Three"],
      ["Severance", undefined],
    ]);
  });

  test("keeps the episodes of the libraries that answered when one library fails", async () => {
    mockPlex([createMetadataItem("movie", { type: "movie", title: "Inception", addedAt: 100 })], {
      "1": "error",
      "7": [
        createEpisode("ep-ok", {
          parentKey: "/library/metadata/season-7",
          parentTitle: "Season 3",
          grandparentTitle: "Andor",
          grandparentThumb: "/library/metadata/show-andor/thumb",
          addedAt: 400,
        }),
      ],
    });

    const releases = await createIntegration().getMediaReleasesAsync();

    expect(releases.map((release) => release.title)).toEqual(["Andor", "Inception"]);
  });

  test("throws a response error instead of a parse error when Plex rejects the request", async () => {
    mockFetch.mockImplementation(() => respond({ error: "unauthorized" }, 401));

    await expect(createIntegration().getMediaReleasesAsync()).rejects.toThrow();
  });
});
