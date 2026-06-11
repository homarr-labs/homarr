import { ParseError, ResponseError } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { NavidromeDashboardData, NavidromeNowPlayingEntry, SubsonicResponseBody } from "./navidrome-types";
import { subsonicResponseSchema } from "./navidrome-types";

const logger = createLogger({ module: "navidromeIntegration" });

const subsonicVersion = "1.16.1";
const subsonicClient = "homarr";
const albumListPageSize = 500;
const maxAlbumListPages = 20;
const emptyLibraryMessage = "Library not found or empty";

const subsonicAuthErrorCodes = new Set([40, 41]);

const asArray = <TValue>(value: TValue | TValue[] | undefined): TValue[] =>
  [value].flat().filter((item): item is TValue => item !== undefined);

export class NavidromeIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const url = this.url("/rest/ping.view", this.getAuthParams());
    const response = await input.fetchAsync(url);

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    const parsed = subsonicResponseSchema.safeParse(await response.json());

    if (!parsed.success) {
      return TestConnectionError.ParseResult(new ParseError("Invalid Subsonic response", { cause: parsed.error }));
    }

    const subsonicResponse = parsed.data["subsonic-response"];

    if (subsonicResponse.status === "failed") {
      const errorCode = subsonicResponse.error?.code;

      if (errorCode !== undefined && subsonicAuthErrorCodes.has(errorCode)) {
        return TestConnectionError.UnauthorizedResult(401);
      }

      return TestConnectionError.UnknownResult(new Error(subsonicResponse.error?.message ?? "Subsonic request failed"));
    }

    return { success: true };
  }

  public async getDashboardDataAsync(): Promise<NavidromeDashboardData> {
    const [artistCount, libraryCounts, nowPlaying] = await Promise.all([
      this.getArtistCountAsync(),
      this.getAlbumAndSongCountsAsync(),
      this.getNowPlayingAsync(),
    ]);

    return {
      artistCount,
      albumCount: libraryCounts.albumCount,
      songCount: libraryCounts.songCount,
      nowPlaying,
    };
  }

  private async getArtistCountAsync(): Promise<number> {
    const response = await this.subsonicRequestAsync("/rest/getArtists.view", {}, { tolerateEmptyLibrary: true });
    return asArray(response.artists?.index).reduce((count, index) => count + asArray(index.artist).length, 0);
  }

  private async getAlbumAndSongCountsAsync(): Promise<{ albumCount: number; songCount: number }> {
    let offset = 0;
    let albumCount = 0;
    let songCount = 0;
    let page = 0;

    while (page < maxAlbumListPages) {
      const response = await this.subsonicRequestAsync(
        "/rest/getAlbumList2.view",
        {
          type: "alphabeticalByName",
          size: albumListPageSize,
          offset,
        },
        { tolerateEmptyLibrary: true },
      );
      const albums = asArray(response.albumList2?.album);

      if (albums.length === 0) {
        break;
      }

      albumCount += albums.length;

      for (const album of albums) {
        songCount += album.songCount ?? 0;
      }

      if (albums.length < albumListPageSize) {
        break;
      }

      offset += albumListPageSize;
      page += 1;
    }

    if (page >= maxAlbumListPages) {
      logger.warn("Reached Navidrome album list page limit", {
        integrationId: this.integration.id,
        maxPages: maxAlbumListPages,
        albumCount,
      });
    }

    return { albumCount, songCount };
  }

  private async getNowPlayingAsync(): Promise<NavidromeNowPlayingEntry[]> {
    const response = await this.subsonicRequestAsync("/rest/getNowPlaying.view", {}, { tolerateEmptyLibrary: true });

    return asArray(response.nowPlaying?.entry).map((entry) => ({
      title: entry.title ?? "",
      artist: entry.artist ?? "",
      album: entry.album ?? "",
      username: entry.username ?? "",
      playerName: entry.playerName ?? "",
    }));
  }

  private async subsonicRequestAsync(
    path: `/rest/${string}`,
    params: Record<string, string | number> = {},
    options: { tolerateEmptyLibrary?: boolean } = {},
  ): Promise<SubsonicResponseBody> {
    const url = this.url(path, { ...this.getAuthParams(), ...params });
    const response = await fetchWithTrustedCertificatesAsync(url);

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const parsed = subsonicResponseSchema.parse(await response.json());
    const subsonicResponse = parsed["subsonic-response"];

    if (subsonicResponse.status === "failed") {
      const message = subsonicResponse.error?.message ?? "Subsonic request failed";

      if (options.tolerateEmptyLibrary && message === emptyLibraryMessage) {
        return subsonicResponse;
      }

      throw new Error(message);
    }

    return subsonicResponse;
  }

  private getAuthParams(): Record<string, string> {
    return {
      u: this.getSecretValue("username"),
      p: this.getSecretValue("password"),
      v: subsonicVersion,
      c: subsonicClient,
      f: "json",
    };
  }
}
