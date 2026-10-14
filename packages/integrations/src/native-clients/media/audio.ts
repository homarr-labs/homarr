import type { z } from "zod/v4";

import { ResponseError } from "@homarr/common/response-error";

import {
  audiobookshelfLibrariesResponseSchema,
  audiobookshelfLibraryStatsSchema,
  audiobookshelfListeningStatsSchema,
  audiobookshelfOnlineUsersResponseSchema,
} from "../../audiobookshelf/audiobookshelf-types";
import type { AudiobookshelfDashboardData } from "../../audiobookshelf/audiobookshelf-types";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { CurrentSessionsInput, StreamSession } from "../../interfaces/media-server/media-server-types";
import { subsonicResponseSchema } from "../../navidrome/navidrome-types";
import type { NavidromeDashboardData, SubsonicResponseBody } from "../../navidrome/navidrome-types";
import { MediaClientHoldError, MediaHttpClient, settleMediaAsync, settleMediaPairAsync } from "./http";
import type { MediaHttpOperation, MediaPublic } from "./http";

const asArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

export class NavidromeMediaClient extends MediaHttpClient implements MediaPublic<"navidrome"> {
  override async getHttpAuthenticationAsync() {
    return { headers: {}, query: this.authParams() };
  }

  async getDashboardDataAsync(): Promise<NavidromeDashboardData> {
    return this.runAsync(async (http) => {
      const [artistCount, counts] = await settleMediaPairAsync(
        this.artistCountAsync(http),
        this.albumAndSongCountsAsync(http),
      );
      return { artistCount, albumCount: counts.albumCount, songCount: counts.songCount };
    });
  }

  async getCurrentSessionsAsync(_options: CurrentSessionsInput): Promise<StreamSession[]> {
    return this.runAsync(async (http) => {
      const response = await this.subsonicRequestAsync(http, "/rest/getNowPlaying.view", {}, true);
      return asArray(response.nowPlaying?.entry).map((entry): StreamSession => {
        const username = entry.username ?? "";
        const playerName = entry.playerName ?? "";
        return {
          sessionId: `${username}-${playerName}`,
          sessionName: playerName,
          user: { userId: username, username, profilePictureUrl: null },
          currentlyPlaying: {
            type: "audio",
            name: entry.title ?? "",
            seasonName: entry.artist || undefined,
            episodeName: null,
            albumName: entry.album ?? "",
            episodeCount: null,
            playback: { state: null, positionMs: null, durationMs: null },
            location: null,
            metadata: null,
          },
        };
      });
    });
  }

  protected testingAsync(http: MediaHttpOperation) {
    return http.responseAsync(this.url("/rest/ping.view", this.authParams()), {}, async (response) => {
      if (!response.ok) return TestConnectionError.StatusResult(response);
      const parsed = subsonicResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new MediaClientHoldError("parse-error-normalization");
      const result = parsed.data["subsonic-response"];
      if (result.status === "failed") {
        const code = result.error?.code;
        if (code === 40 || code === 41) return TestConnectionError.UnauthorizedResult(401);
        return TestConnectionError.UnknownResult(new Error("Subsonic request failed"));
      }
      return { success: true } as const;
    });
  }

  private async artistCountAsync(http: MediaHttpOperation) {
    const response = await this.subsonicRequestAsync(http, "/rest/getArtists.view", {}, true);
    return asArray(response.artists?.index).reduce((count, index) => count + asArray(index.artist).length, 0);
  }

  private async albumAndSongCountsAsync(http: MediaHttpOperation) {
    let offset = 0;
    let albumCount = 0;
    let songCount = 0;
    let page = 0;
    while (page < 20) {
      const response = await this.subsonicRequestAsync(
        http,
        "/rest/getAlbumList2.view",
        { type: "alphabeticalByName", size: 500, offset },
        true,
      );
      const albums = asArray(response.albumList2?.album);
      if (albums.length === 0) break;
      albumCount += albums.length;
      for (const album of albums) songCount += album.songCount ?? 0;
      if (albums.length < 500) break;
      offset += 500;
      page += 1;
    }
    if (page >= 20)
      this.resources.log?.write("warn", "navidrome.album-page-limit", {
        integrationId: this.integration.id,
        maxPages: 20,
        albumCount,
      });
    return { albumCount, songCount };
  }

  private subsonicRequestAsync(
    http: MediaHttpOperation,
    path: `/rest/${string}`,
    params: Record<string, string | number>,
    tolerateEmptyLibrary: boolean,
  ): Promise<SubsonicResponseBody> {
    return http.responseAsync(this.url(path, { ...this.authParams(), ...params }), {}, async (response) => {
      if (!response.ok) throw new ResponseError({ status: response.status });
      const result = subsonicResponseSchema.parse(await response.json())["subsonic-response"];
      if (result.status === "failed") {
        const message = result.error?.message ?? "Subsonic request failed";
        if (!tolerateEmptyLibrary || message !== "Library not found or empty")
          throw new Error("Subsonic request failed");
      }
      return result;
    });
  }

  private authParams(): Record<string, string> {
    return { u: this.secret("username"), p: this.secret("password"), v: "1.16.1", c: "homarr", f: "json" };
  }
}

export class AudiobookshelfMediaClient extends MediaHttpClient implements MediaPublic<"audiobookshelf"> {
  override async getHttpAuthenticationAsync() {
    return { headers: this.authHeaders(), redactValues: [] };
  }

  protected async testingAsync(http: MediaHttpOperation) {
    const health = await http.responseAsync(this.url("/healthcheck"), {}, async (response) =>
      response.ok ? null : TestConnectionError.StatusResult(response),
    );
    if (health) return health;
    return http.responseAsync(
      this.url("/api/authorize"),
      { method: "POST", headers: this.authHeaders() },
      async (response) => (response.ok ? ({ success: true } as const) : TestConnectionError.StatusResult(response)),
    );
  }

  async getDashboardDataAsync(): Promise<AudiobookshelfDashboardData> {
    return this.runAsync(async (http) => {
      const [librariesResult, other] = await settleMediaPairAsync(
        this.readAsync(http, "/api/libraries", audiobookshelfLibrariesResponseSchema),
        settleMediaPairAsync(
          this.readAsync(http, "/api/me/listening-stats", audiobookshelfListeningStatsSchema),
          this.readAsync(http, "/api/users/online", audiobookshelfOnlineUsersResponseSchema),
        ),
      );
      const libraries = librariesResult.libraries;
      const [listeningStats, onlineUsers] = other;
      const stats = await settleMediaAsync(
        libraries.map(async (library) => ({
          library,
          stats: await this.readAsync(http, `/api/libraries/${library.id}/stats`, audiobookshelfLibraryStatsSchema),
        })),
      );
      let totalAudiobooks = 0;
      let totalPodcasts = 0;
      for (const item of stats) {
        if (item.library.mediaType === "book") totalAudiobooks += item.stats.totalItems;
        else totalPodcasts += item.stats.totalItems;
      }
      return {
        libraryCount: libraries.length,
        totalAudiobooks,
        totalPodcasts,
        totalListeningTimeSeconds: listeningStats.totalTime,
        activeSessions: onlineUsers.openSessions.length,
        libraries: stats.map(({ library, stats: libraryStats }) => ({
          id: library.id,
          name: library.name,
          mediaType: library.mediaType,
          totalItems: libraryStats.totalItems,
          totalDurationSeconds: libraryStats.totalDuration ?? null,
          totalSizeBytes: libraryStats.totalSize ?? null,
        })),
      };
    });
  }

  private readAsync<T>(http: MediaHttpOperation, path: `/api/${string}`, schema: z.ZodType<T>) {
    return http.responseAsync(this.url(path), { headers: this.authHeaders() }, async (response) => {
      if (!response.ok) throw new ResponseError(response);
      return schema.parse(await response.json());
    });
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.secret("apiKey")}`, Accept: "application/json" };
  }
}
