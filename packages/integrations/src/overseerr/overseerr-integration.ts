import { z } from "@homarr/validation";
import { Integration } from "../base/integration";
import type { MediaRequest, RequestUser} from "../interfaces/media-requests/media-request";
import { MediaAvailability, MediaRequestStatus } from "../interfaces/media-requests/media-request";

/**
 * Overseerr Integration. See https://api-docs.overseerr.dev
 */
export class OverseerrIntegration extends Integration {
    public async testConnectionAsync(): Promise<void> {
      const response = await fetch(`${this.integration.url}/api/v1/auth/me`, {
        headers: {
          'X-Api-Key': this.getSecretValue('apiKey')
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const json: object = await response.json();
      if (Object.keys(json).includes("id")) {
        return;
      }
      throw new Error(`Received response but unable to parse it: ${JSON.stringify(json)}`);
    }

    public async getRequestsAsync(): Promise<MediaRequest[]> {
      //Change 20 to integration setting
      const response = await fetch(`${this.integration.url}/api/v1/request?take=20`, {
        headers: {
          'X-Api-Key': this.getSecretValue('apiKey')
        }
      });

      const requests = await getRequestsSchema.parseAsync(await response.json());

      return await Promise.all(requests.results.map(async (request): Promise<MediaRequest> => {
        const information = await this.getItemInformationAsync(request.media.tmdbId, request.type);
        return ({
          id: request.id,
          name: information.name,
          status: request.status,
          availability: request.media.status,
          backdropImageUrl: `https://image.tmdb.org/t/p/original/${information.backdropPath}`,
          posterImagePath: `https://image.tmdb.org/t/p/w600_and_h900_bestv2/${information.posterPath}`,
          href: `${this.integration.url}/${request.type}/${request.media.tmdbId}`,
          type: request.type,
          createdAt: request.createdAt,
          airDate: new Date(information.airDate),
          requestedBy: request.requestedBy ? {
            id: request.requestedBy.id,
            username: request.requestedBy.displayName,
            link: `${this.integration.url}/users/${request.requestedBy.id}`,
            profilePictureUrl: constructAvatarUrl(this.integration.url, request.requestedBy.avatar) } as RequestUser : undefined,
        });
      }));
    }

    private async getItemInformationAsync(id: number, type: MediaRequest['type']): Promise<MediaInformation> {
      const response = await fetch(`${this.integration.url}/api/v1/${type}/${id}`, {
        headers: {
          'X-Api-Key': this.getSecretValue('apiKey')
        },
      });

      if(type === "tv") {
        const series = (await response.json()) as TvInformation;
        return {
          name: series.name,
          backdropPath: series.backdropPath ?? series.posterPath,
          posterPath: series.posterPath ?? series.backdropPath,
          airDate: series.firstAirDate,
        } as MediaInformation
      }

      const movie = (await response.json()) as MovieInformation;
      return {
        name: movie.title,
        backdropPath: movie.backdropPath ?? movie.posterPath,
        posterPath: movie.posterPath ?? movie.backdropPath,
        airDate: movie.releaseDate,
      } as MediaInformation
    }
}

const constructAvatarUrl = (appUrl: string, avatar: string) => {
  const isAbsolute = avatar.startsWith('http://') || avatar.startsWith('https://');

  if (isAbsolute) {
    return avatar;
  }

  return `${appUrl}/${avatar}`;
};

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

const getRequestsSchema = z.object({
  results: z.array(z.object({
    id: z.number(),
    status: z.nativeEnum(MediaRequestStatus),
    createdAt: z.string().transform(value => new Date(value)),
    media: z.object({
      status: z.nativeEnum(MediaAvailability),
      tmdbId: z.number(),
    }),
    type: z.enum(['movie', 'tv']),
    requestedBy: z.object({
      id: z.number(),
      displayName: z.string(),
      avatar: z.string(),
    }).optional(),
  }))
})
