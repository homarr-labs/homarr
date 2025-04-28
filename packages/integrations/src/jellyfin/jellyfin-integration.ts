import { Jellyfin } from "@jellyfin/sdk";
import { BaseItemKind } from "@jellyfin/sdk/lib/generated-client/models";
import { getSessionApi } from "@jellyfin/sdk/lib/utils/api/session-api";
import { getSystemApi } from "@jellyfin/sdk/lib/utils/api/system-api";
import type { AxiosInstance } from "axios";

import { createAxiosCertificateInstanceAsync } from "@homarr/certificates/server";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { handleAxiosError } from "../base/test-connection/errors/axios";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { CurrentSessionsInput, StreamSession } from "../interfaces/media-server/session";

export class JellyfinIntegration extends Integration {
  private readonly jellyfin: Jellyfin = new Jellyfin({
    clientInfo: {
      name: "Homarr",
      version: "0.0.1",
    },
    deviceInfo: {
      name: "Homarr",
      id: "homarr",
    },
  });

  public async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    try {
      const api = await this.getApiAsync(input.axiosInstance);
      const systemApi = getSystemApi(api);
      await systemApi.getPingSystem();
      return { success: true };
    } catch (error) {
      return handleAxiosError(error);
    }
  }

  public async getCurrentSessionsAsync(options: CurrentSessionsInput): Promise<StreamSession[]> {
    const api = await this.getApiAsync();
    const sessionApi = getSessionApi(api);
    const sessions = await sessionApi.getSessions();

    if (sessions.status !== 200) {
      throw new Error(`Jellyfin server ${this.url("/")} returned a non successful status code: ${sessions.status}`);
    }

    return sessions.data
      .filter((sessionInfo) => sessionInfo.UserId !== undefined)
      .filter((sessionInfo) => sessionInfo.DeviceId !== "homarr")
      .filter((sessionInfo) => !options.showOnlyPlaying || sessionInfo.NowPlayingItem !== undefined)
      .map((sessionInfo): StreamSession => {
        let currentlyPlaying: StreamSession["currentlyPlaying"] | null = null;

        if (sessionInfo.NowPlayingItem) {
          currentlyPlaying = {
            type: convertJellyfinType(sessionInfo.NowPlayingItem.Type),
            name: sessionInfo.NowPlayingItem.SeriesName ?? sessionInfo.NowPlayingItem.Name ?? "",
            seasonName: sessionInfo.NowPlayingItem.SeasonName ?? "",
            episodeName: sessionInfo.NowPlayingItem.EpisodeTitle,
            albumName: sessionInfo.NowPlayingItem.Album ?? "",
            episodeCount: sessionInfo.NowPlayingItem.EpisodeCount,
          };
        }

        return {
          sessionId: `${sessionInfo.Id}`,
          sessionName: `${sessionInfo.Client} (${sessionInfo.DeviceName})`,
          user: {
            profilePictureUrl: this.url(`/Users/${sessionInfo.UserId}/Images/Primary`).toString(),
            userId: sessionInfo.UserId ?? "",
            username: sessionInfo.UserName ?? "",
          },
          currentlyPlaying,
        };
      });
  }

  /**
   * Constructs an ApiClient synchronously with an ApiKey or asynchronously
   * with a username and password.
   * @returns An instance of Api that has been authenticated
   */
  private async getApiAsync(fallbackInstance?: AxiosInstance) {
    const axiosInstance = fallbackInstance ?? (await createAxiosCertificateInstanceAsync());
    if (this.hasSecretValue("apiKey")) {
      const apiKey = this.getSecretValue("apiKey");
      return this.jellyfin.createApi(this.url("/").toString(), apiKey, axiosInstance);
    }

    const apiClient = this.jellyfin.createApi(this.url("/").toString(), undefined, axiosInstance);
    // Authentication state is stored internally in the Api class, so now
    // requests that require authentication can be made normally.
    // see https://typescript-sdk.jellyfin.org/#usage
    await apiClient.authenticateUserByName(this.getSecretValue("username"), this.getSecretValue("password"));
    return apiClient;
  }
}

export const convertJellyfinType = (
  kind: BaseItemKind | undefined,
): Exclude<StreamSession["currentlyPlaying"], null>["type"] => {
  switch (kind) {
    case BaseItemKind.Audio:
    case BaseItemKind.MusicVideo:
      return "audio";
    case BaseItemKind.Episode:
    case BaseItemKind.Video:
      return "video";
    case BaseItemKind.Movie:
      return "movie";
    case BaseItemKind.TvChannel:
    case BaseItemKind.TvProgram:
    case BaseItemKind.LiveTvChannel:
    case BaseItemKind.LiveTvProgram:
    default:
      return "tv";
  }
};
