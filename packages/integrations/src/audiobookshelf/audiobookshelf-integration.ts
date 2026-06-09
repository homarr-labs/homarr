import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import {
  audiobookshelfLibrariesResponseSchema,
  audiobookshelfLibraryStatsSchema,
  audiobookshelfListeningStatsSchema,
  audiobookshelfOnlineUsersResponseSchema,
} from "./audiobookshelf-types";
import type {
  AudiobookshelfDashboardData,
  AudiobookshelfLibrary,
  AudiobookshelfLibraryStats,
} from "./audiobookshelf-types";

const mediaTypeCountField = {
  book: "totalAudiobooks",
  podcast: "totalPodcasts",
} as const satisfies Record<
  AudiobookshelfLibrary["mediaType"],
  keyof Pick<AudiobookshelfDashboardData, "totalAudiobooks" | "totalPodcasts">
>;

export class AudiobookshelfIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const healthResponse = await input.fetchAsync(this.url("/healthcheck"));

    if (!healthResponse.ok) {
      return TestConnectionError.StatusResult(healthResponse);
    }

    const authorizeResponse = await input.fetchAsync(this.url("/api/authorize"), {
      method: "POST",
      headers: this.getAuthHeaders(),
    });

    if (!authorizeResponse.ok) {
      return TestConnectionError.StatusResult(authorizeResponse);
    }

    return { success: true };
  }

  public async getDashboardDataAsync(): Promise<AudiobookshelfDashboardData> {
    const [libraries, listeningStats, activeSessions] = await Promise.all([
      this.getLibrariesAsync(),
      this.getListeningStatsAsync(),
      this.getActiveSessionsCountAsync(),
    ]);

    const statsByLibrary = await Promise.all(
      libraries.map(async (library) => ({
        mediaType: library.mediaType,
        stats: await this.getLibraryStatsAsync(library.id),
      })),
    );

    const counts = {
      totalAudiobooks: 0,
      totalPodcasts: 0,
    };

    for (const item of statsByLibrary) {
      const countField = mediaTypeCountField[item.mediaType];
      counts[countField] += item.stats.totalItems;
    }

    return {
      libraryCount: libraries.length,
      totalAudiobooks: counts.totalAudiobooks,
      totalPodcasts: counts.totalPodcasts,
      totalListeningTimeSeconds: listeningStats.totalTime,
      activeSessions,
    };
  }

  private async getLibrariesAsync(): Promise<AudiobookshelfLibrary[]> {
    const response = await this.getAsync("/api/libraries");

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return audiobookshelfLibrariesResponseSchema.parse(await response.json()).libraries;
  }

  private async getLibraryStatsAsync(libraryId: string): Promise<AudiobookshelfLibraryStats> {
    const response = await this.getAsync(`/api/libraries/${libraryId}/stats`);

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return audiobookshelfLibraryStatsSchema.parse(await response.json());
  }

  private async getListeningStatsAsync() {
    const response = await this.getAsync("/api/me/listening-stats");

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return audiobookshelfListeningStatsSchema.parse(await response.json());
  }

  private async getActiveSessionsCountAsync(): Promise<number> {
    const response = await this.getAsync("/api/users/online");

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return audiobookshelfOnlineUsersResponseSchema.parse(await response.json()).openSessions.length;
  }

  private async getAsync(path: `/api/${string}` | "/healthcheck") {
    return await fetchWithTrustedCertificatesAsync(this.url(path), {
      headers: this.getAuthHeaders(),
    });
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
      Accept: "application/json",
    };
  }
}
