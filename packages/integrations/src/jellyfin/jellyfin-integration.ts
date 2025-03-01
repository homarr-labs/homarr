import { Jellyfin } from "@jellyfin/sdk";
import { BaseItemKind } from "@jellyfin/sdk/lib/generated-client/models";
import { getSessionApi } from "@jellyfin/sdk/lib/utils/api/session-api";
import { getSystemApi } from "@jellyfin/sdk/lib/utils/api/system-api";

import { createAxiosCertificateInstanceAsync } from "@homarr/certificates/server";

import { Integration } from "../base/integration";
import type { StreamSession } from "../interfaces/media-server/session";

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

  public async testConnectionAsync(): Promise<void> {
    const api = await this.getApiAsync();
    const systemApi = getSystemApi(api);
    await systemApi.getPingSystem();
  }

  public async getCurrentSessionsAsync(): Promise<StreamSession[]> {
    const api = await this.getApiAsync();
    const sessionApi = getSessionApi(api);
    const sessions = await sessionApi.getSessions();

    if (sessions.status !== 200) {
      throw new Error(`Jellyfin server ${this.url("/")} returned a non successful status code: ${sessions.status}`);
    }

    return sessions.data
      .filter((sessionInfo) => sessionInfo.UserId !== undefined)
      .filter((sessionInfo) => sessionInfo.DeviceId !== "homarr")
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
          currentlyPlaying: currentlyPlaying,
        };
      });
  }

  /**
   * Constructs an ApiClient synchronously with an ApiKey or asynchronously
   * with a username and password.
   * @returns An instance of Api that has been authenticated
   */
  private async getApiAsync() {
    const httpsAgent = await createAxiosCertificateInstanceAsync();
    if (this.hasSecretValue("apiKey")) {
      const apiKey = this.getSecretValue("apiKey");
      return this.jellyfin.createApi(this.url("/").toString(), apiKey, httpsAgent);
    }

    const apiClient = this.jellyfin.createApi(this.url("/").toString(), undefined, httpsAgent);
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
