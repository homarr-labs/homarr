import { z } from "zod/v4";

import { ResponseError } from "@homarr/common/response-error";

import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import { apiKeyAuth } from "../../http-auth";
import type {
  MediaAvailability,
  MediaRequest,
  MediaRequestStatus,
  RequestStats,
  RequestUser,
} from "../../interfaces/media-requests/media-request-types";
import {
  UpstreamMediaAvailability,
  UpstreamMediaRequestStatus,
} from "../../interfaces/media-requests/media-request-types";
import { MediaClientHoldError, MediaHttpClient, settleMediaPairAsync } from "./http";
import type { MediaHttpOperation, MediaPublic } from "./http";
import {
  mediaInformationSchema,
  movieInformationSchema,
  requestSearchSchema,
  requestStatsSchema,
  requestUsersSchema,
  requestsSchema,
  tvInformationSchema,
} from "./request-schemas";

interface ItemInformation {
  name: string;
  backdropPath?: string;
  posterPath?: string;
  airDate: string;
}

export class OverseerrMediaClient extends MediaHttpClient implements MediaPublic<"overseerr"> {
  override async getHttpAuthenticationAsync() {
    this.resources.context.signal.throwIfAborted();
    return apiKeyAuth(this.integration);
  }

  async searchAsync(query: string) {
    return this.runAsync((http) =>
      http.responseAsync(this.url("/api/v1/search", { query }), this.auth(), async (response) => {
        const data = await requestSearchSchema.parseAsync(await response.json());
        return (data.results ?? []).map((result) => {
          const path = result.mediaType === "person" ? result.profilePath : result.posterPath;
          return {
            id: result.id,
            name: "name" in result ? result.name : result.title,
            link: this.externalUrl(`/${result.mediaType}/${result.id}`).toString(),
            image: path ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${path}` : undefined,
            text: "overview" in result ? result.overview : undefined,
            type: result.mediaType,
            inLibrary: result.mediaInfo !== undefined,
            availability: result.mediaInfo ? this.mapAvailability(result.mediaInfo.status, false) : undefined,
          };
        });
      }),
    );
  }

  async getSeriesInformationAsync(mediaType: "movie" | "tv", id: number) {
    return this.runAsync((http) =>
      http.responseAsync(this.url(`/api/v1/${mediaType}/${id}`), this.auth(), async (response) => {
        const data = await mediaInformationSchema.parseAsync(await response.json());
        const requestedSeasons = [
          ...new Set(
            data.mediaInfo?.requests?.flatMap((request) => request.seasons.map((season) => season.seasonNumber)) ?? [],
          ),
        ];
        const { mediaInfo: _mediaInfo, ...rest } = data;
        return { ...rest, requestedSeasons };
      }),
    );
  }

  async requestMediaAsync(mediaType: "movie" | "tv", id: number, seasons?: number[]): Promise<void> {
    return this.requestMediaOperationAsync(mediaType, id, seasons);
  }

  private async requestMediaOperationAsync(mediaType: "movie" | "tv", id: number, seasons?: number[]): Promise<void> {
    this.requireInteraction();
    await this.runAsync((http) =>
      http.responseAsync(
        this.url("/api/v1/request"),
        {
          method: "POST",
          body: JSON.stringify({ mediaType, mediaId: id, seasons }),
          headers: { "X-Api-Key": this.secret("apiKey"), "Content-Type": "application/json" },
        },
        async (response) => {
          if (response.status !== 201) {
            await response.text();
            throw new Error(
              `Status code ${response.status} does not match the expected status code. The request was likely not created.`,
            );
          }
        },
      ),
    );
  }

  async getRequestsAsync(): Promise<MediaRequest[]> {
    return this.runAsync(async (http) => {
      const fetchRequests = (parameters: { take: number; filter?: string; sort?: string }) =>
        http.responseAsync(
          this.url("/api/v1/request", parameters),
          this.auth(),
          async (response) => (await requestsSchema.parseAsync(await response.json())).results,
        );
      const [pending, all] = await settleMediaPairAsync(
        fetchRequests({ take: 20, filter: "pending" }),
        fetchRequests({ take: 20, sort: "modified" }),
      );
      const requests =
        pending.length > 0 && all.length > 0
          ? pending.concat(all.filter((request) => request.status !== UpstreamMediaRequestStatus.PendingApproval))
          : pending.length > 0
            ? pending
            : all;
      if (requests.length === 0) return [];
      const informationByMedia = new Map<string, Promise<ItemInformation>>();
      const settled = await Promise.allSettled(
        requests.map(async (request): Promise<MediaRequest> => {
          const key = `${request.type}:${request.media.tmdbId}`;
          let informationPromise = informationByMedia.get(key);
          if (!informationPromise) {
            informationPromise = this.getItemInformationAsync(http, request.media.tmdbId, request.type);
            informationByMedia.set(key, informationPromise);
          }
          const information = await informationPromise;
          const inProgress = (request.media.downloadStatus ?? []).length >= 1;
          return {
            id: request.id,
            name: information.name,
            status: this.mapRequestStatus(request.status),
            availability: this.mapAvailability(request.media.status, inProgress),
            backdropImageUrl: `https://image.tmdb.org/t/p/original/${information.backdropPath}`,
            posterImagePath: `https://image.tmdb.org/t/p/w600_and_h900_bestv2/${information.posterPath}`,
            href: this.externalUrl(`/${request.type}/${request.media.tmdbId}`).toString(),
            type: request.type,
            createdAt: request.createdAt,
            airDate: new Date(information.airDate),
            requestedBy: request.requestedBy
              ? {
                  ...request.requestedBy,
                  displayName: request.requestedBy.displayName,
                  link: this.externalUrl(`/users/${request.requestedBy.id}`).toString(),
                  avatar: this.avatarUrl(request.requestedBy.avatar),
                }
              : undefined,
          };
        }),
      );
      http.context.signal.throwIfAborted();
      const fulfilled = settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      if (fulfilled.length === 0) throw new Error("Failed to resolve any media request information");
      return fulfilled;
    });
  }

  async getStatsAsync(): Promise<RequestStats> {
    return this.runAsync((http) =>
      http.responseAsync(
        this.url("/api/v1/request/count"),
        this.auth(),
        async (response) => await requestStatsSchema.parseAsync(await response.json()),
      ),
    );
  }

  async getUsersAsync(): Promise<RequestUser[]> {
    return this.runAsync((http) =>
      http.responseAsync(this.url("/api/v1/user", { take: 10, sort: "requests" }), this.auth(), async (response) => {
        const users = (await requestUsersSchema.parseAsync(await response.json())).results;
        return users.map((user) => ({
          ...user,
          link: this.externalUrl(`/users/${user.id}`).toString(),
          avatar: this.avatarUrl(user.avatar),
        }));
      }),
    );
  }

  async approveRequestAsync(requestId: number): Promise<void> {
    return this.moderateRequestOperationAsync(requestId, "approve");
  }

  async declineRequestAsync(requestId: number): Promise<void> {
    return this.moderateRequestOperationAsync(requestId, "decline");
  }

  private async moderateRequestOperationAsync(requestId: number, action: "approve" | "decline"): Promise<void> {
    this.requireInteraction();
    this.resources.log?.write("debug", `media-request.${action}.started`, {
      requestId,
      integration: this.integration.name,
    });
    await this.runAsync((http) =>
      http.responseAsync(
        this.url(`/api/v1/request/${requestId}/${action}`),
        { ...this.auth(), method: "POST" },
        async (response) => {
          if (!response.ok) throw new ResponseError(response);
        },
      ),
    );
    this.resources.log?.write("debug", `media-request.${action}.completed`, {
      requestId,
      integration: this.integration.name,
    });
  }

  private requireInteraction(): void {
    throw new MediaClientHoldError("interact-authority");
  }

  protected mapRequestStatus(status: number): MediaRequestStatus {
    switch (status) {
      case UpstreamMediaRequestStatus.PendingApproval:
        return "pending";
      case UpstreamMediaRequestStatus.Approved:
        return "approved";
      case UpstreamMediaRequestStatus.Declined:
        return "declined";
      case UpstreamMediaRequestStatus.Completed:
        return "completed";
      case UpstreamMediaRequestStatus.Failed:
      default:
        return "failed";
    }
  }

  protected mapAvailability(availability: number, inProgress: boolean): MediaAvailability {
    switch (availability) {
      case UpstreamMediaAvailability.Available:
        return inProgress ? "processing" : "available";
      case UpstreamMediaAvailability.PartiallyAvailable:
        return inProgress ? "processing" : "partiallyAvailable";
      case UpstreamMediaAvailability.Processing:
        return inProgress ? "processing" : "requested";
      case UpstreamMediaAvailability.Pending:
        return "pending";
      case UpstreamMediaAvailability.JellyseerrBlacklistedOrOverseerrDeleted:
        return "deleted";
      case UpstreamMediaAvailability.Unknown:
      default:
        return inProgress ? "processing" : "unknown";
    }
  }

  protected testingAsync(http: MediaHttpOperation) {
    return http.responseAsync(this.url("/api/v1/auth/me"), this.auth(), async (response) => {
      if (!response.ok) return TestConnectionError.StatusResult(response);
      await z.object({ id: z.number() }).parseAsync(await response.json());
      return { success: true } as const;
    });
  }

  private getItemInformationAsync(
    http: MediaHttpOperation,
    id: number,
    type: "movie" | "tv",
  ): Promise<ItemInformation> {
    return http.responseAsync(this.url(`/api/v1/${type}/${id}`), this.auth(), async (response) => {
      if (!response.ok)
        throw new Error(`Failed to fetch ${type} information for id ${id}: ${response.status} ${response.statusText}`);
      const data: unknown = await response.json();
      if (type === "tv") {
        const series = tvInformationSchema.parse(data);
        return {
          name: series.name,
          backdropPath: series.backdropPath ?? series.posterPath,
          posterPath: series.posterPath ?? series.backdropPath,
          airDate: series.firstAirDate,
        };
      }
      const movie = movieInformationSchema.parse(data);
      return {
        name: movie.title,
        backdropPath: movie.backdropPath ?? movie.posterPath,
        posterPath: movie.posterPath ?? movie.backdropPath,
        airDate: movie.releaseDate,
      };
    });
  }

  private avatarUrl(avatar: string) {
    return avatar.startsWith("http://") || avatar.startsWith("https://")
      ? avatar
      : this.externalUrl(`/${avatar}`).toString();
  }

  private auth() {
    return { headers: { "X-Api-Key": this.secret("apiKey") } };
  }
}

export class JellyseerrMediaClient extends OverseerrMediaClient implements MediaPublic<"jellyseerr"> {
  protected override mapAvailability(availability: number, inProgress: boolean): MediaAvailability {
    if (availability === UpstreamMediaAvailability.JellyseerrBlacklistedOrOverseerrDeleted) return "blacklisted";
    if (availability === UpstreamMediaAvailability.JellyseerrDeleted) return "deleted";
    return super.mapAvailability(availability, inProgress);
  }
}

export class SeerrMediaClient extends OverseerrMediaClient implements MediaPublic<"seerr"> {}
