import { BaseItemKind } from "@jellyfin/sdk/lib/generated-client/models";
import { z } from "zod/v4";

import { ResponseError } from "@homarr/common/response-error";

import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { MediaRelease } from "../../interfaces/media-releases";
import type { CurrentSessionsInput, StreamSession } from "../../interfaces/media-server/media-server-types";
import { MediaHttpClient } from "./http";
import type { MediaHttpOperation, MediaPublic } from "./http";
import { mediaReleaseKind, playbackSession } from "./playback";

const sessionSchema = z.object({
  NowPlayingItem: z
    .object({
      Type: z.enum(BaseItemKind).optional(),
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
    .object({ IsPaused: z.boolean().nullish(), PositionTicks: z.number().nullish(), PlayMethod: z.string().nullish() })
    .nullish(),
  TranscodingInfo: z
    .object({
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
    })
    .nullish(),
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
    .transform((value) => new Date(value))
    .optional(),
  DateCreated: z
    .string()
    .datetime()
    .transform((value) => new Date(value)),
  Genres: z.array(z.string()),
  CommunityRating: z.number().optional(),
  RunTimeTicks: z.number(),
  Type: z.string(),
});
const userSchema = z.array(z.object({ Id: z.string(), Name: z.string() }));
const deviceId = "homarr-emby-integration";
const authorization = `Emby Client="Dashboard", Device="Homarr", DeviceId="${deviceId}", Version="0.0.1"`;

export class EmbyMediaClient extends MediaHttpClient implements MediaPublic<"emby"> {
  protected testingAsync(http: MediaHttpOperation) {
    return http.responseAsync(this.url("/emby/System/Ping"), { headers: this.headers() }, async (response) =>
      response.ok ? ({ success: true } as const) : TestConnectionError.StatusResult(response),
    );
  }

  async getCurrentSessionsAsync(options: CurrentSessionsInput): Promise<StreamSession[]> {
    return this.runAsync((http) =>
      http.responseAsync(this.url("/emby/Sessions"), { headers: this.headers() }, async (response) => {
        if (!response.ok)
          throw new Error(
            `Emby server ${this.integration.id} returned a non successful status code: ${response.status}`,
          );
        const result = z.array(sessionSchema).safeParse(await response.json());
        if (!result.success)
          throw new Error(
            `Emby server ${this.integration.id} returned an unexpected response: ${result.error.message}`,
          );
        return result.data
          .filter((session) => session.UserId !== undefined)
          .filter((session) => session.DeviceId !== deviceId)
          .filter((session) => !options.showOnlyPlaying || session.NowPlayingItem !== undefined)
          .map((session) =>
            playbackSession(session, this.externalUrl(`/Users/${session.UserId}/Images/Primary`).toString()),
          );
      }),
    );
  }

  async getMediaReleasesAsync(): Promise<MediaRelease[]> {
    return this.runAsync(async (http) => {
      const users = await http.responseAsync(
        this.url("/Users/Public"),
        { headers: this.headers() },
        async (response) => {
          if (!response.ok) throw new ResponseError(response);
          return userSchema.parse(await response.json());
        },
      );
      const userId = users.at(0)?.Id;
      if (!userId) throw new Error("No users found");
      return http.responseAsync(
        this.url(
          `/Users/${userId}/Items/Latest?Limit=100&Fields=CommunityRating,Studios,PremiereDate,Genres,ChildCount,ProductionYear,DateCreated,Overview,Taglines`,
        ),
        { headers: this.headers() },
        async (response) => {
          if (!response.ok) throw new ResponseError(response);
          return z
            .array(itemSchema)
            .parse(await response.json())
            .map((item): MediaRelease => ({
              id: item.Id,
              type: mediaReleaseKind(item.Type),
              title: item.Name,
              subtitle: item.Taglines.at(0),
              description: item.Overview,
              releaseDate: item.PremiereDate ?? item.DateCreated,
              imageUrls: {
                poster: this.externalUrl(
                  `/Items/${item.Id}/Images/Primary?maxHeight=492&maxWidth=328&quality=90`,
                ).toString(),
                backdrop: this.externalUrl(`/Items/${item.Id}/Images/Backdrop/0?maxWidth=960&quality=70`).toString(),
              },
              producer: item.Studios?.at(0)?.Name,
              rating: item.CommunityRating?.toFixed(1),
              tags: item.Genres,
              href: this.externalUrl(`/web/index.html#!/item?id=${item.Id}&serverId=${item.ServerId}`).toString(),
            }));
        },
      );
    });
  }

  private headers() {
    return { "X-Emby-Token": this.secret("apiKey"), Authorization: authorization };
  }
}
