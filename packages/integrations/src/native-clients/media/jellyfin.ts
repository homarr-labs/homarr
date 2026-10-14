import { Jellyfin } from "@jellyfin/sdk";
import { getSessionApi } from "@jellyfin/sdk/lib/utils/api/session-api";
import { getSystemApi } from "@jellyfin/sdk/lib/utils/api/system-api";
import { getUserApi } from "@jellyfin/sdk/lib/utils/api/user-api";
import { getUserLibraryApi } from "@jellyfin/sdk/lib/utils/api/user-library-api";
import { z } from "zod/v4";

import type { MediaRelease } from "../../interfaces/media-releases";
import type { CurrentSessionsInput, StreamSession } from "../../interfaces/media-server/media-server-types";
import { sanitizeIntegrationTransportError } from "../../runtime/transport-errors";
import { MediaHttpClient } from "./http";
import type { MediaHttpOperation, MediaPublic } from "./http";
import { mediaReleaseKind, playbackSession } from "./playback";

const authorizationPrefix = 'MediaBrowser Client="Homarr", Device="Homarr", DeviceId="homarr", Version="0.0.1"';
const authenticationSchema = z.object({ AccessToken: z.string().min(1) });

export class JellyfinMediaClient extends MediaHttpClient implements MediaPublic<"jellyfin"> {
  private pendingAuthentication: Promise<string> | undefined;

  override async getHttpAuthenticationAsync() {
    return this.runAsync(async (http) => {
      const accessToken = await this.accessTokenAsync(http);
      return {
        headers: { Authorization: `${authorizationPrefix}, Token="${accessToken}"` },
        redactValues: [accessToken],
      };
    });
  }

  protected async testingAsync(http: MediaHttpOperation) {
    const api = this.createApi(http, this.hasSecret("apiKey") ? this.secret("apiKey") : undefined);
    if (!this.hasSecret("apiKey"))
      await this.sdkAsync(http, () =>
        getUserApi(api).authenticateUserByName(
          {
            authenticateUserByName: { Username: this.secret("username"), Pw: this.secret("password") },
          },
          this.requestOptions(http),
        ),
      );
    await this.sdkAsync(http, () => getSystemApi(api).getPingSystem(this.requestOptions(http)));
    return { success: true } as const;
  }

  async getCurrentSessionsAsync(options: CurrentSessionsInput): Promise<StreamSession[]> {
    return this.runAsync(async (http) => {
      const api = this.createApi(http, await this.accessTokenAsync(http));
      const sessions = await this.sdkAsync(http, () => getSessionApi(api).getSessions({}, this.requestOptions(http)));
      return sessions.data
        .filter((session) => session.UserId !== undefined)
        .filter((session) => session.DeviceId !== "homarr")
        .filter((session) => !options.showOnlyPlaying || session.NowPlayingItem !== undefined)
        .map((session) =>
          playbackSession(session, this.externalUrl(`/Users/${session.UserId}/Images/Primary`).toString()),
        );
    });
  }

  async getMediaReleasesAsync(): Promise<MediaRelease[]> {
    return this.runAsync(async (http) => {
      const api = this.createApi(http, await this.accessTokenAsync(http));
      const users = await this.sdkAsync(http, () => getUserApi(api).getUsers({}, this.requestOptions(http)));
      const userId = users.data.at(0)?.Id;
      if (!userId) throw new Error("No users found");
      const result = await this.sdkAsync(http, () =>
        getUserLibraryApi(api).getLatestMedia(
          {
            fields: ["CustomRating", "Studios", "Genres", "ChildCount", "DateCreated", "Overview", "Taglines"],
            userId,
            limit: 100,
            groupItems: false,
          },
          this.requestOptions(http),
        ),
      );
      return result.data.map((item): MediaRelease => {
        if (item.Id === undefined || item.Name == null || (item.PremiereDate == null && item.DateCreated == null))
          throw new Error("Jellyfin returned incomplete media release metadata");
        const date = item.PremiereDate ?? item.DateCreated;
        if (date == null) throw new Error("Jellyfin returned no media release date");
        return {
          id: item.Id,
          type: mediaReleaseKind(item.Type),
          title: item.Name,
          subtitle: item.Taglines?.at(0),
          description: item.Overview ?? undefined,
          releaseDate: new Date(date),
          imageUrls: {
            poster: this.externalUrl(
              `/Items/${item.Id}/Images/Primary?maxHeight=492&maxWidth=328&quality=90`,
            ).toString(),
            backdrop: this.externalUrl(`/Items/${item.Id}/Images/Backdrop/0?maxWidth=960&quality=70`).toString(),
          },
          producer: item.Studios?.at(0)?.Name ?? undefined,
          rating: item.CommunityRating?.toFixed(1),
          tags: item.Genres ?? [],
          href: this.externalUrl(`/web/index.html#!/details?id=${item.Id}&serverId=${item.ServerId}`).toString(),
        };
      });
    });
  }

  private createApi(http: MediaHttpOperation, accessToken: string | undefined) {
    const jellyfin = new Jellyfin({
      clientInfo: { name: "Homarr", version: "0.0.1" },
      deviceInfo: { name: "Homarr", id: "homarr" },
    });
    return jellyfin.createApi(this.url("/").toString(), accessToken, http.input.axiosInstance);
  }

  private async accessTokenAsync(http: MediaHttpOperation): Promise<string> {
    if (this.hasSecret("apiKey")) return this.secret("apiKey");
    if (this.pendingAuthentication) return await this.pendingAuthentication;
    const pending = http.responseAsync(
      this.url("/Users/AuthenticateByName"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authorizationPrefix },
        body: JSON.stringify({ Username: this.secret("username"), Pw: this.secret("password") }),
        redirect: "error",
      },
      async (response) => {
        if (!response.ok) throw new Error("Jellyfin authentication failed");
        const result = authenticationSchema.safeParse(await response.json().catch(() => null));
        if (!result.success) throw new Error("Jellyfin authentication failed");
        return result.data.AccessToken;
      },
    );
    this.pendingAuthentication = pending;
    try {
      return await pending;
    } catch (error) {
      http.context.signal.throwIfAborted();
      throw sanitizeIntegrationTransportError(error);
    } finally {
      if (this.pendingAuthentication === pending) this.pendingAuthentication = undefined;
    }
  }

  private requestOptions(http: MediaHttpOperation) {
    return { signal: http.context.signal, maxRedirects: 0 };
  }

  private async sdkAsync<T>(http: MediaHttpOperation, operation: () => Promise<T>): Promise<T> {
    http.context.signal.throwIfAborted();
    try {
      const result = await operation();
      http.context.signal.throwIfAborted();
      return result;
    } catch (error) {
      http.context.signal.throwIfAborted();
      throw sanitizeIntegrationTransportError(error);
    }
  }
}
