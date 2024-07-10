import { z } from "@homarr/validation";
import { Integration } from "../base/integration";
import type { MediaRequest} from "../interfaces/media-requests/media-request";
import { MediaRequestStatus } from "../interfaces/media-requests/media-request";

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
      const response = await fetch(`${this.integration.url}/api/v1/request`, {
        headers: {
          'X-Api-Key': this.getSecretValue('apiKey')
        }
      });

      const requests = await getRequestsSchema.parseAsync(await response.json());

      return await Promise.all(requests.results.map(async (request): Promise<MediaRequest> => {
        const information = await this.getItemInformationAsync(request.media.tmdbId, request.type);
        return ({
          name: information.name,
          status: request.status,
          backdropImageUrl: `https://image.tmdb.org/t/p/original/${information.backdropPath}`,
          posterImagePath: `https://image.tmdb.org/t/p/w600_and_h900_bestv2/${information.posterPath}`,
          href: `${this.integration.url}/${request.type}/${request.media.tmdbId}`,
          type: request.type,
          createdAt: request.createdAt,
          requestedBy: request.requestedBy ? {
            id: request.requestedBy.id,
            username: request.requestedBy.username,
            link: `${this.integration.url}/users/${request.requestedBy.id}`,
            profilePictureUrl: `${this.integration.url}/${request.requestedBy.avatar}` } : undefined
        });
      }));
    }

    private async getItemInformationAsync(id: number, type: MediaRequest['type']): Promise<MediaInformation> {
      if (type === 'tv') {
        const tvResponse = await fetch(`${this.integration.url}/api/v1/tv/${id}`, {
          headers: {
            'X-Api-Key': this.getSecretValue('apiKey')
          },
        });

        const series = (await tvResponse.json()) as MediaInformation;

        return {
          name: series.name,
          backdropPath: series.backdropPath,
          posterPath: series.posterPath
        };
      }

      const movieResponse = await fetch(`${this.integration.url}/api/v1/movie/${id}`, {
        headers: {
          'X-Api-Key': this.getSecretValue('apiKey')
        },
      });

      const movie = (await movieResponse.json()) as MediaInformation;

      return {
        name: movie.name,
        backdropPath: movie.backdropPath,
        posterPath: movie.posterPath
      };
    }
}

interface MediaInformation {
  name: string;
  backdropPath: string;
  posterPath: string;
}

const getRequestsSchema = z.object({
  results: z.array(z.object({
    status: z.nativeEnum(MediaRequestStatus),
    createdAt: z.string().transform(value => new Date(value)),
    media: z.object({
      tmdbId: z.number()
    }),
    type: z.enum(['movie', 'tv']),
    requestedBy: z.object({
      id: z.number(),
      username: z.string().optional(),
      avatar: z.string()
    }).optional()
  }))
})
