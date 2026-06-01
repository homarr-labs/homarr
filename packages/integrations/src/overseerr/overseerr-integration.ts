import { z } from "zod/v4";
import type { RequestInit, Response } from "undici";
import { fetch } from "undici";

import { splitToChunksWithNItems } from "@homarr/common";
import { createCertificateAgentAsync } from "@homarr/core/infrastructure/http";
import { withTimeoutAsync } from "@homarr/core/infrastructure/http/timeout";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { ISearchableIntegration } from "../base/searchable-integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { IMediaRequestIntegration } from "../interfaces/media-requests/media-request-integration";
import type {
  MediaAvailability,
  MediaRequest,
  MediaRequestStatus,
  RequestStats,
  RequestUser,
} from "../interfaces/media-requests/media-request-types";
import {
  UpstreamMediaAvailability,
  UpstreamMediaRequestStatus,
} from "../interfaces/media-requests/media-request-types";

const logger = createLogger({ module: "overseerrIntegration" });

const REQUEST_TIMEOUT_MS = 10_000;
const DETAIL_FETCH_BATCH_SIZE = 5;

interface OverseerrFetchClient {
  fetchAsync: (url: URL, init?: RequestInit) => Promise<Response>;
  fetchUncheckedAsync: (url: URL, init?: RequestInit) => Promise<Response>;
}

interface OverseerrSearchResult {
  id: number;
  name: string;
  link: string;
  image?: string;
  text?: string;
  type: Exclude<z.infer<typeof searchSchema>["results"], undefined>[number]["mediaType"];
}

/**
 * Overseerr Integration. See https://api-docs.overseerr.dev
 */
export class OverseerrIntegration
  extends Integration
  implements IMediaRequestIntegration, ISearchableIntegration<OverseerrSearchResult>
{
  private async createFetchClientAsync(): Promise<OverseerrFetchClient> {
    const agent = await createCertificateAgentAsync(undefined);
    const apiKey = this.getSecretValue("apiKey");

    const requestAsync = async (url: URL, init?: RequestInit) => {
      return await withTimeoutAsync(
        (signal) =>
          fetch(url, {
            ...init,
            signal,
            dispatcher: agent,
            headers: {
              "X-Api-Key": apiKey,
              ...init?.headers,
            },
          }),
        REQUEST_TIMEOUT_MS,
      );
    };

    return {
      fetchAsync: async (url, init) => {
        const response = await requestAsync(url, init);

        if (!response.ok) {
          throw new Error(`Overseerr request failed: ${response.status} ${response.statusText} (${url.toString()})`);
        }

        return response;
      },
      fetchUncheckedAsync: requestAsync,
    };
  }

  public async searchAsync(query: string) {
    const client = await this.createFetchClientAsync();
    const response = await client.fetchAsync(this.url("/api/v1/search", { query }));
    const schemaData = await searchSchema.parseAsync(await response.json());

    if (!schemaData.results) {
      return [];
    }

    return schemaData.results.map((result) => ({
      id: result.id,
      name: "name" in result ? result.name : result.title,
      link: this.externalUrl(`/${result.mediaType}/${result.id}`).toString(),
      image: constructSearchResultImage(result),
      text: "overview" in result ? result.overview : undefined,
      type: result.mediaType,
      inLibrary: result.mediaInfo !== undefined,
      availability: result.mediaInfo
        ? this.mapAvailability(result.mediaInfo.status as UpstreamMediaAvailability, false)
        : undefined,
    }));
  }

  public async getSeriesInformationAsync(mediaType: "movie" | "tv", id: number) {
    const client = await this.createFetchClientAsync();
    const url = mediaType === "tv" ? this.url(`/api/v1/tv/${id}`) : this.url(`/api/v1/movie/${id}`);
    const response = await client.fetchAsync(url);
    const data = await mediaInformationSchema.parseAsync(await response.json());
    const requestedSeasons = [
      ...new Set(
        data.mediaInfo?.requests?.flatMap((req) => req.seasons.map((s) => s.seasonNumber)) ?? [],
      ),
    ];
    const { mediaInfo: _strip, ...rest } = data;
    return { ...rest, requestedSeasons };
  }

  /**
   * Request a media. See https://api-docs.overseerr.dev/#/request/post_request
   * @param mediaType The media type to request. Can be "movie" or "tv".
   * @param id The Overseerr ID of the media to request.
   * @param seasons A list of the seasons that should be requested.
   */
  public async requestMediaAsync(mediaType: "movie" | "tv", id: number, seasons?: number[]): Promise<void> {
    const client = await this.createFetchClientAsync();
    const url = this.url("/api/v1/request");
    const response = await client.fetchUncheckedAsync(url, {
      method: "POST",
      body: JSON.stringify({
        mediaType,
        mediaId: id,
        seasons,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.status !== 201) {
      throw new Error(
        `Status code ${response.status} does not match the expected status code. The request was likely not created. Response: ${await response.text()}`,
      );
    }
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/v1/auth/me"), {
      headers: {
        "X-Api-Key": this.getSecretValue("apiKey"),
      },
    });

    if (!response.ok) return TestConnectionError.StatusResult(response);

    const responseSchema = z.object({ id: z.number() });
    await responseSchema.parseAsync(await response.json());
    return { success: true };
  }

  public async getRequestsAsync(): Promise<MediaRequest[]> {
    const client = await this.createFetchClientAsync();

    const [pendingResponse, allResponse] = await Promise.all([
      client.fetchAsync(this.url("/api/v1/request", { take: 20, filter: "pending" })),
      client.fetchAsync(this.url("/api/v1/request", { take: 20 })),
    ]);

    const pendingResults = (await getRequestsSchema.parseAsync(await pendingResponse.json())).results;
    const allResults = (await getRequestsSchema.parseAsync(await allResponse.json())).results;

    let requests;

    if (pendingResults.length > 0 && allResults.length > 0) {
      requests = pendingResults.concat(
        allResults.filter(({ status }) => status !== UpstreamMediaRequestStatus.PendingApproval),
      );
    } else if (pendingResults.length > 0) requests = pendingResults;
    else if (allResults.length > 0) requests = allResults;
    else return [];

    const uniqueKeys = [...new Set(requests.map((request) => `${request.type}:${request.media.tmdbId}`))];
    const informationByKey = new Map<string, MediaInformation>();

    for (const batch of splitToChunksWithNItems(uniqueKeys, DETAIL_FETCH_BATCH_SIZE)) {
      const batchResults = await Promise.all(
        batch.map(async (key) => {
          const separatorIndex = key.indexOf(":");
          const type = key.slice(0, separatorIndex) as MediaRequest["type"];
          const tmdbId = Number(key.slice(separatorIndex + 1));
          const information = await this.getItemInformationAsync(client, type, tmdbId);
          return [key, information] as const;
        }),
      );

      for (const [key, information] of batchResults) {
        informationByKey.set(key, information);
      }
    }

    return requests.map((request): MediaRequest => {
      const information = informationByKey.get(`${request.type}:${request.media.tmdbId}`)!;

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
          ? ({
              ...request.requestedBy,
              displayName: request.requestedBy.displayName,
              link: this.externalUrl(`/users/${request.requestedBy.id}`).toString(),
              avatar: this.constructAvatarUrl(request.requestedBy.avatar).toString(),
            } satisfies Omit<RequestUser, "requestCount">)
          : undefined,
      };
    });
  }

  protected mapRequestStatus(status: UpstreamMediaRequestStatus): MediaRequestStatus {
    switch (status) {
      case UpstreamMediaRequestStatus.PendingApproval:
        return "pending";
      case UpstreamMediaRequestStatus.Approved:
        return "approved";
      case UpstreamMediaRequestStatus.Declined:
        return "declined";
      case UpstreamMediaRequestStatus.Failed:
        return "failed";
      case UpstreamMediaRequestStatus.Completed:
        return "completed";
      default:
        return "failed";
    }
  }

  // See https://github.com/seerr-team/seerr/blob/af083a3cd5c3e3d5d7917fdf4fdd67fe3f39c46b/src/components/StatusBadge/index.tsx#L153-L387
  protected mapAvailability(availability: UpstreamMediaAvailability, inProgress: boolean): MediaAvailability {
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

  public async getStatsAsync(): Promise<RequestStats> {
    const client = await this.createFetchClientAsync();
    const response = await client.fetchAsync(this.url("/api/v1/request/count"));
    return await getStatsSchema.parseAsync(await response.json());
  }

  public async getUsersAsync(): Promise<RequestUser[]> {
    const client = await this.createFetchClientAsync();
    const response = await client.fetchAsync(this.url("/api/v1/user", { take: 10, sort: "requests" }));
    const users = (await getUsersSchema.parseAsync(await response.json())).results;
    return users.map((user): RequestUser => {
      return {
        ...user,
        link: this.externalUrl(`/users/${user.id}`).toString(),
        avatar: this.constructAvatarUrl(user.avatar).toString(),
      };
    });
  }

  public async approveRequestAsync(requestId: number): Promise<void> {
    logger.info("Approving media request", { requestId, integration: this.integration.name });
    const client = await this.createFetchClientAsync();
    await client.fetchUncheckedAsync(this.url(`/api/v1/request/${requestId}/approve`), {
      method: "POST",
    }).then((response) => {
      if (!response.ok) {
        logger.error(
          new ErrorWithMetadata("Failed to approve media request", {
            requestId,
            integration: this.integration.name,
            reason: `${response.status} ${response.statusText}`,
            url: response.url,
          }),
        );
      }

      logger.info("Successfully approved media request", { requestId, integration: this.integration.name });
    });
  }

  public async declineRequestAsync(requestId: number): Promise<void> {
    logger.info("Declining media request", { requestId, integration: this.integration.name });
    const client = await this.createFetchClientAsync();
    await client.fetchUncheckedAsync(this.url(`/api/v1/request/${requestId}/decline`), {
      method: "POST",
    }).then((response) => {
      if (!response.ok) {
        logger.error(
          new ErrorWithMetadata("Failed to decline media request", {
            requestId,
            integration: this.integration.name,
            reason: `${response.status} ${response.statusText}`,
            url: response.url,
          }),
        );
      }

      logger.info("Successfully declined media request", { requestId, integration: this.integration.name });
    });
  }

  private async getItemInformationAsync(
    client: OverseerrFetchClient,
    type: MediaRequest["type"],
    id: number,
  ): Promise<MediaInformation> {
    const response = await client.fetchAsync(this.url(`/api/v1/${type}/${id}`));
    const rawData = (await response.json()) as TvInformation | MovieInformation;
    return mediaInformationFromResponse[type](rawData as never);
  }

  private constructAvatarUrl(avatar: string) {
    const isAbsolute = avatar.startsWith("http://") || avatar.startsWith("https://");

    if (isAbsolute) {
      return avatar;
    }

    return this.externalUrl(`/${avatar}`);
  }
}

interface MediaInformation {
  name: string;
  backdropPath?: string;
  posterPath?: string;
  airDate: string;
}

interface TvInformation {
  name: string;
  backdropPath?: string;
  posterPath?: string;
  firstAirDate: string;
}

interface MovieInformation {
  title: string;
  backdropPath?: string;
  posterPath?: string;
  releaseDate: string;
}

const mediaInformationFromResponse = {
  tv: (series: TvInformation): MediaInformation => ({
    name: series.name,
    backdropPath: series.backdropPath ?? series.posterPath,
    posterPath: series.posterPath ?? series.backdropPath,
    airDate: series.firstAirDate,
  }),
  movie: (movie: MovieInformation): MediaInformation => ({
    name: movie.title,
    backdropPath: movie.backdropPath ?? movie.posterPath,
    posterPath: movie.posterPath ?? movie.backdropPath,
    airDate: movie.releaseDate,
  }),
} satisfies Record<MediaRequest["type"], (data: TvInformation | MovieInformation) => MediaInformation>;

const mediaInfoRequestsSchema = z.object({
  requests: z.array(z.object({
    seasons: z.array(z.object({
      seasonNumber: z.number(),
    })),
  })).optional(),
}).optional();

const mediaInformationSchema = z.union([
  z.object({
    id: z.number(),
    overview: z.string(),
    seasons: z.array(
      z.object({
        id: z.number(),
        seasonNumber: z.number(),
        name: z.string().min(0),
        episodeCount: z.number().min(0),
      }),
    ),
    numberOfSeasons: z.number(),
    posterPath: z.string().startsWith("/"),
    mediaInfo: mediaInfoRequestsSchema,
  }),
  z.object({
    id: z.number(),
    overview: z.string(),
    posterPath: z.string().startsWith("/"),
    mediaInfo: mediaInfoRequestsSchema,
  }),
]);

const searchMediaInfoSchema = z.object({
  status: z.number(),
}).optional();

const searchSchema = z.object({
  results: z
    .array(
      z.discriminatedUnion("mediaType", [
        z.object({
          id: z.number(),
          mediaType: z.literal("tv"),
          name: z.string(),
          posterPath: z.string().startsWith("/").endsWith(".jpg").nullable(),
          overview: z.string(),
          mediaInfo: searchMediaInfoSchema,
        }),
        z.object({
          id: z.number(),
          mediaType: z.literal("movie"),
          title: z.string(),
          posterPath: z.string().startsWith("/").endsWith(".jpg").nullable(),
          overview: z.string(),
          mediaInfo: searchMediaInfoSchema,
        }),
        z.object({
          id: z.number(),
          mediaType: z.literal("person"),
          name: z.string(),
          profilePath: z.string().startsWith("/").endsWith(".jpg").nullable(),
          mediaInfo: searchMediaInfoSchema,
        }),
      ]),
    )
    .optional(),
});

const getRequestsSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        status: z.enum(UpstreamMediaRequestStatus),
        createdAt: z.string().transform((value) => new Date(value)),
        media: z.object({
          status: z.enum(UpstreamMediaAvailability),
          tmdbId: z.number(),
          downloadStatus: z.array(z.unknown()).optional(),
        }),
        type: z.enum(["movie", "tv"]),
        requestedBy: z
          .object({
            id: z.number(),
            displayName: z.string(),
            avatar: z.string(),
          })
          .optional(),
      }),
    )
    .optional()
    .transform((val) => {
      if (!val) {
        return [];
      }
      return val;
    }),
});

const getStatsSchema = z.object({
  total: z.number(),
  movie: z.number(),
  tv: z.number(),
  pending: z.number(),
  approved: z.number(),
  declined: z.number(),
  processing: z.number(),
  available: z.number(),
});

const getUsersSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        displayName: z.string(),
        avatar: z.string(),
        requestCount: z.number(),
      }),
    )
    .optional()
    .transform((val) => {
      if (!val) {
        return [];
      }
      return val;
    }),
});

const constructSearchResultImage = (result: Exclude<z.infer<typeof searchSchema>["results"], undefined>[number]) => {
  const path = getResultImagePath(result);
  if (!path) {
    return undefined;
  }

  return `https://image.tmdb.org/t/p/w600_and_h900_bestv2${path}`;
};

const getResultImagePath = (result: Exclude<z.infer<typeof searchSchema>["results"], undefined>[number]) => {
  switch (result.mediaType) {
    case "person":
      return result.profilePath;
    case "tv":
    case "movie":
      return result.posterPath;
    default:
      throw new Error(
        `Unable to get search result image from media type '${(result as { mediaType: string }).mediaType}'`,
      );
  }
};
