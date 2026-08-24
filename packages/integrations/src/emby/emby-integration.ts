import { BaseItemKind } from "@jellyfin/sdk/lib/generated-client/models";
import { z } from "zod/v4";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { IMediaServerIntegration } from "../interfaces/media-server/media-server-integration";
import type { CurrentSessionsInput, StreamSession } from "../interfaces/media-server/media-server-types";
import { convertJellyfinType, parseLocation, ticksToMs } from "../jellyfin/jellyfin-integration";
import type { IMediaReleasesIntegration, MediaRelease, MediaType } from "../types";

const transcodingInfoSchema = z.object({
  Bitrate: z.number().nullish(),
  Framerate: z.number().nullish(),
  AudioChannels: z.number().nullish(),
  AudioCodec: z.string().nullish(),
  VideoCodec: z.string().nullish(),
  Container: z.string().nullish(),
  IsVideoDirect: z.boolean().nullish(),
  IsAudioDirect: z.boolean().nullish(),
  Width: z.number().nullish(),
  Height: z.number().nullish(),
});

const sessionSchema = z.object({
  NowPlayingItem: z
    .object({
      Type: z.nativeEnum(BaseItemKind).optional(),
      SeriesName: z.string().nullish(),
      Name: z.string().nullish(),
      SeasonName: z.string().nullish(),
      ParentIndexNumber: z.number().nullish(),
      EpisodeTitle: z.string().nullish(),
      IndexNumber: z.number().nullish(),
      Album: z.string().nullish(),
      EpisodeCount: z.number().nullish(),
      RunTimeTicks: z.number().nullish(),
      Width: z.number().nullish(),
      Height: z.number().nullish(),
      MediaStreams: z.array(z.object({ BitRate: z.number().nullish() })).nullish(),
      MediaSources: z.array(z.object({ Bitrate: z.number().nullish() })).nullish(),
    })
    .optional(),
  Id: z.string(),
  Client: z.string().nullish(),
  DeviceId: z.string().nullish(),
  DeviceName: z.string().nullish(),
  UserId: z.string().optional(),
  UserName: z.string().nullish(),
  RemoteEndPoint: z.string().nullish(),
  PlayState: z
    .object({
      IsPaused: z.boolean().nullish(),
      PositionTicks: z.number().nullish(),
      PlayMethod: z.string().nullish(),
    })
    .nullish(),
  TranscodingInfo: transcodingInfoSchema.nullish(),
});

const itemSchema = z.object({
  Id: z.string(),
  ServerId: z.string(),
  Name: z.string(),
  Taglines: z.array(z.string()),
  Studios: z.array(z.object({ Name: z.string() })).optional(),
  Overview: z.string().optional(),
  PremiereDate: z
    .string()
    .datetime()
    .transform((date) => new Date(date))
    .optional(),
  DateCreated: z
    .string()
    .datetime()
    .transform((date) => new Date(date)),
  Genres: z.array(z.string()),
  CommunityRating: z.number().optional(),
  RunTimeTicks: z.number(),
  Type: z.string(), // for example "Movie"
});

const userSchema = z.object({
  Id: z.string(),
  Name: z.string(),
});

export class EmbyIntegration extends Integration implements IMediaServerIntegration, IMediaReleasesIntegration {
  private static readonly apiKeyHeader = "X-Emby-Token";
  private static readonly deviceId = "homarr-emby-integration";
  private static readonly authorizationHeaderValue = `Emby Client="Dashboard", Device="Homarr", DeviceId="${EmbyIntegration.deviceId}", Version="0.0.1"`;

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const apiKey = super.getSecretValue("apiKey");
    const response = await input.fetchAsync(super.url("/emby/System/Ping"), {
      headers: {
        [EmbyIntegration.apiKeyHeader]: apiKey,
        Authorization: EmbyIntegration.authorizationHeaderValue,
      },
    });

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    return {
      success: true,
    };
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
          const isEpisode = sessionInfo.NowPlayingItem.Type === BaseItemKind.Episode;
          const transcodingInfo = sessionInfo.TranscodingInfo;
          const positionMs = ticksToMs(sessionInfo.PlayState?.PositionTicks);
          const durationMs = ticksToMs(sessionInfo.NowPlayingItem.RunTimeTicks);
          // Emby only reliably fills in MediaSources[].Bitrate for a transcoding session -
          // /Sessions has no `fields` selector to force it, so fall back to summing the individual
          // media streams' own bitrates (populated from the source file's metadata) for direct play.
          const mediaStreamsBitrateBps = sessionInfo.NowPlayingItem.MediaStreams?.reduce(
            (sum, stream) => sum + (stream.BitRate ?? 0),
            0,
          );
          const bitrateBps =
            transcodingInfo?.Bitrate ??
            sessionInfo.NowPlayingItem.MediaSources?.[0]?.Bitrate ??
            (mediaStreamsBitrateBps || null);
          const bitrateKbps = bitrateBps !== null ? Math.round(bitrateBps / 1000) : null;

          currentlyPlaying = {
            type: convertJellyfinType(sessionInfo.NowPlayingItem.Type),
            name: sessionInfo.NowPlayingItem.SeriesName ?? sessionInfo.NowPlayingItem.Name ?? "",
            seasonName: sessionInfo.NowPlayingItem.SeasonName ?? "",
            seasonNumber: isEpisode ? (sessionInfo.NowPlayingItem.ParentIndexNumber ?? null) : null,
            episodeName: isEpisode ? sessionInfo.NowPlayingItem.EpisodeTitle : null,
            episodeNumber: isEpisode ? (sessionInfo.NowPlayingItem.IndexNumber ?? null) : null,
            albumName: sessionInfo.NowPlayingItem.Album ?? "",
            episodeCount: sessionInfo.NowPlayingItem.EpisodeCount,
            playback: {
              state: sessionInfo.PlayState?.IsPaused ? "paused" : "playing",
              positionMs,
              durationMs,
            },
            location: parseLocation(sessionInfo.RemoteEndPoint),
            metadata: {
              video: {
                resolution:
                  sessionInfo.NowPlayingItem.Width && sessionInfo.NowPlayingItem.Height
                    ? {
                        width: sessionInfo.NowPlayingItem.Width,
                        height: sessionInfo.NowPlayingItem.Height,
                      }
                    : null,
                frameRate: transcodingInfo?.Framerate ?? null,
              },
              audio: {
                channelCount: transcodingInfo?.AudioChannels ?? null,
                codec: transcodingInfo?.AudioCodec ?? null,
              },
              transcoding: {
                resolution:
                  transcodingInfo?.Width && transcodingInfo.Height
                    ? {
                        width: transcodingInfo.Width,
                        height: transcodingInfo.Height,
                      }
                    : null,
                target: {
                  audioCodec: transcodingInfo?.AudioCodec ?? null,
                  videoCodec: transcodingInfo?.VideoCodec ?? null,
                },
                container: transcodingInfo?.Container ?? null,
                isVideoDirect: transcodingInfo?.IsVideoDirect ?? true,
                isAudioDirect: transcodingInfo?.IsAudioDirect ?? true,
                containerChanged: sessionInfo.PlayState?.PlayMethod === "DirectStream",
              },
              bitrateKbps,
            },
          };
        }

        return {
          sessionId: `${sessionInfo.Id}`,
          sessionName: `${sessionInfo.Client} (${sessionInfo.DeviceName})`,
          user: {
            profilePictureUrl: super.externalUrl(`/Users/${sessionInfo.UserId}/Images/Primary`).toString(),
            userId: sessionInfo.UserId ?? "",
            username: sessionInfo.UserName ?? "",
          },
          currentlyPlaying,
        };
      });
  }

  public async getMediaReleasesAsync(): Promise<MediaRelease[]> {
    const limit = 100;
    const users = await this.fetchUsersPublicAsync();
    const userId = users.at(0)?.id;
    if (!userId) {
      throw new Error("No users found");
    }

    const apiKey = super.getSecretValue("apiKey");
    const response = await fetchWithTrustedCertificatesAsync(
      super.url(
        `/Users/${userId}/Items/Latest?Limit=${limit}&Fields=CommunityRating,Studios,PremiereDate,Genres,ChildCount,ProductionYear,DateCreated,Overview,Taglines`,
      ),
      {
        headers: {
          [EmbyIntegration.apiKeyHeader]: apiKey,
          Authorization: EmbyIntegration.authorizationHeaderValue,
        },
      },
    );

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const items = z.array(itemSchema).parse(await response.json());

    return items.map((item) => ({
      id: item.Id,
      type: this.mapMediaReleaseType(item.Type),
      title: item.Name,
      subtitle: item.Taglines.at(0),
      description: item.Overview,
      releaseDate: item.PremiereDate ?? item.DateCreated,
      imageUrls: {
        poster: super.externalUrl(`/Items/${item.Id}/Images/Primary?maxHeight=492&maxWidth=328&quality=90`).toString(),
        backdrop: super.externalUrl(`/Items/${item.Id}/Images/Backdrop/0?maxWidth=960&quality=70`).toString(),
      },
      producer: item.Studios?.at(0)?.Name,
      rating: item.CommunityRating?.toFixed(1),
      tags: item.Genres,
      href: super.externalUrl(`/web/index.html#!/item?id=${item.Id}&serverId=${item.ServerId}`).toString(),
    }));
  }

  private mapMediaReleaseType(type: string | undefined): MediaType {
    switch (type) {
      case "Audio":
      case "AudioBook":
      case "MusicAlbum":
        return "music";
      case "Book":
        return "book";
      case "Episode":
      case "Series":
      case "Season":
        return "tv";
      case "Movie":
        return "movie";
      case "Video":
        return "video";
      default:
        return "unknown";
    }
  }

  // https://dev.emby.media/reference/RestAPI/UserService/getUsersPublic.html
  private async fetchUsersPublicAsync(): Promise<{ id: string; name: string }[]> {
    const apiKey = super.getSecretValue("apiKey");
    const response = await fetchWithTrustedCertificatesAsync(super.url("/Users/Public"), {
      headers: {
        [EmbyIntegration.apiKeyHeader]: apiKey,
        Authorization: EmbyIntegration.authorizationHeaderValue,
      },
    });
    if (!response.ok) {
      throw new ResponseError(response);
    }
    const users = z.array(userSchema).parse(await response.json());

    return users.map((user) => ({
      id: user.Id,
      name: user.Name,
    }));
  }
}
