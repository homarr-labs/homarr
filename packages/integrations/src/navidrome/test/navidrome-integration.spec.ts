import { Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationSecret } from "../../base/types";
import { NavidromeIntegration } from "../navidrome-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const TEST_URL = "https://navidrome.example.com";
const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const secrets: IntegrationSecret[] = [
  { kind: "username", value: "admin" },
  { kind: "password", value: "secret" },
];

const toUrlString = (url: unknown): string => String(url);

const createIntegration = () =>
  new NavidromeIntegration({
    id: "test-navidrome",
    name: "Test Navidrome",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets: secrets,
  });

const subsonicOk = <T extends Record<string, unknown>>(data: T) =>
  JSON.stringify({
    "subsonic-response": { status: "ok", version: "1.16.1", ...data },
  });

const subsonicFailed = (message: string) =>
  JSON.stringify({
    "subsonic-response": { status: "failed", error: { code: 70, message } },
  });

beforeEach(() => {
  mockFetch.mockReset();
});

describe("NavidromeIntegration.getDashboardDataAsync", () => {
  test("paginates album list and counts songs", async () => {
    const makeAlbums = (count: number, songCount: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: `album-${i}`,
        name: `Album ${i}`,
        songCount,
      }));

    mockFetch.mockImplementation((url) => {
      const urlStr = toUrlString(url);

      if (urlStr.includes("getArtists")) {
        return Promise.resolve(
          new Response(subsonicOk({ artists: { index: [{ name: "A", artist: [{ id: "1", name: "Artist" }] }] } }), {
            status: 200,
          }),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }

      if (urlStr.includes("getAlbumList2")) {
        const offsetMatch = urlStr.match(/offset=(\d+)/);
        const offset = Number(offsetMatch?.[1] ?? 0);

        if (offset === 0) {
          return Promise.resolve(
            new Response(subsonicOk({ albumList2: { album: makeAlbums(500, 10) } }), { status: 200 }),
          ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
        }

        if (offset === 500) {
          return Promise.resolve(
            new Response(subsonicOk({ albumList2: { album: makeAlbums(200, 5) } }), { status: 200 }),
          ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
        }

        return Promise.resolve(new Response(subsonicOk({ albumList2: {} }), { status: 200 })) as unknown as ReturnType<
          typeof fetchWithTrustedCertificatesAsync
        >;
      }

      if (urlStr.includes("getNowPlaying")) {
        return Promise.resolve(new Response(subsonicOk({ nowPlaying: {} }), { status: 200 })) as unknown as ReturnType<
          typeof fetchWithTrustedCertificatesAsync
        >;
      }

      return Promise.resolve(new Response(subsonicOk({}), { status: 200 })) as unknown as ReturnType<
        typeof fetchWithTrustedCertificatesAsync
      >;
    });

    const integration = createIntegration();
    const result = await integration.getDashboardDataAsync();

    expect(result.albumCount).toBe(700);
    expect(result.songCount).toBe(500 * 10 + 200 * 5);
    expect(result.artistCount).toBe(1);
    expect(result.nowPlaying).toEqual([]);
  });

  test("handles empty library gracefully", async () => {
    mockFetch.mockImplementation((url) => {
      const urlStr = toUrlString(url);

      if (urlStr.includes("getArtists")) {
        return Promise.resolve(
          new Response(subsonicFailed("Library not found or empty"), { status: 200 }),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }

      if (urlStr.includes("getAlbumList2")) {
        return Promise.resolve(
          new Response(subsonicFailed("Library not found or empty"), { status: 200 }),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }

      if (urlStr.includes("getNowPlaying")) {
        return Promise.resolve(
          new Response(subsonicFailed("Library not found or empty"), { status: 200 }),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }

      return Promise.resolve(new Response(subsonicOk({}), { status: 200 })) as unknown as ReturnType<
        typeof fetchWithTrustedCertificatesAsync
      >;
    });

    const integration = createIntegration();
    const result = await integration.getDashboardDataAsync();

    expect(result.artistCount).toBe(0);
    expect(result.albumCount).toBe(0);
    expect(result.songCount).toBe(0);
    expect(result.nowPlaying).toEqual([]);
  });

  test("throws on non-empty-library subsonic error", async () => {
    mockFetch.mockImplementation(
      () =>
        Promise.resolve(new Response(subsonicFailed("Permission denied"), { status: 200 })) as unknown as ReturnType<
          typeof fetchWithTrustedCertificatesAsync
        >,
    );

    const integration = createIntegration();
    await expect(integration.getDashboardDataAsync()).rejects.toThrow();
  });

  test("now playing maps entries correctly", async () => {
    mockFetch.mockImplementation((url) => {
      const urlStr = toUrlString(url);

      if (urlStr.includes("getNowPlaying")) {
        return Promise.resolve(
          new Response(
            subsonicOk({
              nowPlaying: {
                entry: { title: "Song", artist: "Band", album: "LP", username: "user1", playerName: "Chrome" },
              },
            }),
            { status: 200 },
          ),
        ) as unknown as ReturnType<typeof fetchWithTrustedCertificatesAsync>;
      }

      if (urlStr.includes("getArtists")) {
        return Promise.resolve(new Response(subsonicOk({ artists: {} }), { status: 200 })) as unknown as ReturnType<
          typeof fetchWithTrustedCertificatesAsync
        >;
      }

      if (urlStr.includes("getAlbumList2")) {
        return Promise.resolve(new Response(subsonicOk({ albumList2: {} }), { status: 200 })) as unknown as ReturnType<
          typeof fetchWithTrustedCertificatesAsync
        >;
      }

      return Promise.resolve(new Response(subsonicOk({}), { status: 200 })) as unknown as ReturnType<
        typeof fetchWithTrustedCertificatesAsync
      >;
    });

    const integration = createIntegration();
    const result = await integration.getDashboardDataAsync();

    expect(result.nowPlaying).toHaveLength(1);
    expect(result.nowPlaying[0]).toEqual({
      title: "Song",
      artist: "Band",
      album: "LP",
      username: "user1",
      playerName: "Chrome",
    });
  });
});
