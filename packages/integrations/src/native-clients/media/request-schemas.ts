import { z } from "zod/v4";

import {
  UpstreamMediaAvailability,
  UpstreamMediaRequestStatus,
} from "../../interfaces/media-requests/media-request-types";

const mediaInfoRequestsSchema = z
  .object({
    requests: z.array(z.object({ seasons: z.array(z.object({ seasonNumber: z.number() })) })).optional(),
  })
  .optional();
export const mediaInformationSchema = z.union([
  z.object({
    id: z.number(),
    overview: z.string(),
    seasons: z.array(
      z.object({ id: z.number(), seasonNumber: z.number(), name: z.string().min(0), episodeCount: z.number().min(0) }),
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
const searchMediaInfo = z.object({ status: z.number() }).optional();
export const requestSearchSchema = z.object({
  results: z
    .array(
      z.discriminatedUnion("mediaType", [
        z.object({
          id: z.number(),
          mediaType: z.literal("tv"),
          name: z.string(),
          posterPath: z.string().startsWith("/").endsWith(".jpg").nullable(),
          overview: z.string(),
          mediaInfo: searchMediaInfo,
        }),
        z.object({
          id: z.number(),
          mediaType: z.literal("movie"),
          title: z.string(),
          posterPath: z.string().startsWith("/").endsWith(".jpg").nullable(),
          overview: z.string(),
          mediaInfo: searchMediaInfo,
        }),
        z.object({
          id: z.number(),
          mediaType: z.literal("person"),
          name: z.string(),
          profilePath: z.string().startsWith("/").endsWith(".jpg").nullable(),
          mediaInfo: searchMediaInfo,
        }),
      ]),
    )
    .optional(),
});
export const requestsSchema = z.object({
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
        requestedBy: z.object({ id: z.number(), displayName: z.string(), avatar: z.string() }).optional(),
      }),
    )
    .optional()
    .transform((value) => value ?? []),
});
export const requestStatsSchema = z.object({
  total: z.number(),
  movie: z.number(),
  tv: z.number(),
  pending: z.number(),
  approved: z.number(),
  declined: z.number(),
  processing: z.number(),
  available: z.number(),
});
export const requestUsersSchema = z.object({
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
    .transform((value) => value ?? []),
});
export const tvInformationSchema = z.object({
  name: z.string(),
  backdropPath: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
  posterPath: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
  firstAirDate: z.string(),
});
export const movieInformationSchema = z.object({
  title: z.string(),
  backdropPath: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
  posterPath: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
  releaseDate: z.string(),
});
