// @vitest-environment node
import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationSecret } from "../../base/types";
import { PlexIntegration } from "../plex-integration";

const imageProxyMocks = vi.hoisted(() => ({
  createImageAsync: vi.fn((url: string) => Promise.resolve(`proxied:${url}`)),
}));

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
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