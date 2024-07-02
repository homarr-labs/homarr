import { Jellyfin } from "@jellyfin/sdk";
import { getSessionApi } from "@jellyfin/sdk/lib/utils/api/session-api";
import { getSystemApi } from "@jellyfin/sdk/lib/utils/api/system-api";

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
    const api = this.getApi();
    const systemApi = getSystemApi(api);
    await systemApi.getPingSystem();
  }

  public async getCurrentSessionsAsync(): Promise<StreamSession[]> {
    const api = this.getApi();
    const sessionApi = getSessionApi(api);
    const sessions = await sessionApi.getSessions();

    if (sessions.status !== 200) {
      throw new Error(
        `Jellyfin server ${this.integration.url} returned a non successful status code: ${sessions.status}`,
      );
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
          profilePictureUrl: `${this.integration.url}/Users/${sessionInfo.UserId}/Images/Primary`,
          userId: sessionInfo.UserId ?? "",
          username: sessionInfo.UserName ?? "",
        },
        currentlyPlaying: nowPlaying,
      };
    });
  }

  private getApi() {
    const apiKey = this.getSecretValue("apiKey");
    return this.jellyfin.createApi(this.integration.url, apiKey);
  }
}
