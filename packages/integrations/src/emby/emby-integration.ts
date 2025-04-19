import { BaseItemKind } from "@jellyfin/sdk/lib/generated-client/models";
import { z } from "zod";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";

import { Integration } from "../base/integration";
import type { CurrentSessionsInput, StreamSession } from "../interfaces/media-server/session";
import { convertJellyfinType } from "../jellyfin/jellyfin-integration";

const sessionSchema = z.object({
  NowPlayingItem: z
    .object({
      Type: z.nativeEnum(BaseItemKind).optional(),
      SeriesName: z.string().nullish(),
      Name: z.string().nullish(),
      SeasonName: z.string().nullish(),
      EpisodeTitle: z.string().nullish(),
      Album: z.string().nullish(),
      EpisodeCount: z.number().nullish(),
    })
    .optional(),
  Id: z.string(),
  Client: z.string().nullish(),
  DeviceId: z.string().nullish(),
  DeviceName: z.string().nullish(),
  UserId: z.string().optional(),
  UserName: z.string().nullish(),
});

export class EmbyIntegration extends Integration {
  private static readonly apiKeyHeader = "X-Emby-Token";
  private static readonly deviceId = "homarr-emby-integration";
  private static readonly authorizationHeaderValue = `Emby Client="Dashboard", Device="Homarr", DeviceId="${EmbyIntegration.deviceId}", Version="0.0.1"`;

  public async testConnectionAsync(): Promise<void> {
    const apiKey = super.getSecretValue("apiKey");

    await super.handleTestConnectionResponseAsync({
      queryFunctionAsync: async () => {
        return await fetchWithTrustedCertificatesAsync(super.url("/emby/System/Ping"), {
          headers: {
            [EmbyIntegration.apiKeyHeader]: apiKey,
            Authorization: EmbyIntegration.authorizationHeaderValue,
          },
        });
      },
    });
  }

  public async getCurrentSessionsAsync(options: CurrentSessionsInput): Promise<StreamSession[]> {
    const apiKey = super.getSecretValue("apiKey");
    const response = await fetchWithTrustedCertificatesAsync(super.url("/emby/Sessions"), {
      headers: {
        [EmbyIntegration.apiKeyHeader]: apiKey,
        Authorization: EmbyIntegration.authorizationHeaderValue,
      },
    });

    if (!response.ok) {
      throw new Error(`Emby server ${this.integration.id} returned a non successful status code: ${response.status}`);
    }

    const result = z.array(sessionSchema).safeParse(await response.json());

    if (!result.success) {
      throw new Error(`Emby server ${this.integration.id} returned an unexpected response: ${result.error.message}`);
    }

    return result.data
      .filter((sessionInfo) => sessionInfo.UserId !== undefined)
      .filter((sessionInfo) => sessionInfo.DeviceId !== EmbyIntegration.deviceId)
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
            profilePictureUrl: super.url(`/Users/${sessionInfo.UserId}/Images/Primary`).toString(),
            userId: sessionInfo.UserId ?? "",
            username: sessionInfo.UserName ?? "",
          },
          currentlyPlaying,
        };
      });
  }
}
