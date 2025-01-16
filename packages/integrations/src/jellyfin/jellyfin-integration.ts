import { Jellyfin } from "@jellyfin/sdk";
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

    return sessions.data.map((sessionInfo): StreamSession => {
      let nowPlaying: StreamSession["currentlyPlaying"] | null = null;

      if (sessionInfo.NowPlayingItem) {
        nowPlaying = {
          type: "tv",
          name: sessionInfo.NowPlayingItem.Name ?? "",
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
        currentlyPlaying: nowPlaying,
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
