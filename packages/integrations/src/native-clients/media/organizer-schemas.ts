import { z } from "zod/v4";

const images = z.array(z.object({ coverType: z.string(), remoteUrl: z.string().url() }));
const calendarImages = z.array(
  z.object({
    coverType: z.enum(["unknown", "poster", "banner", "fanart", "screenshot", "headshot", "clearlogo"]),
    remoteUrl: z.string().url(),
  }),
);
const audioCoverType = z.enum([
  "unknown",
  "poster",
  "banner",
  "fanart",
  "screenshot",
  "headshot",
  "cover",
  "disc",
  "logo",
  "clearlogo",
]);
const date = z.string().transform((value) => new Date(value));

export const sonarrLibrarySchema = z.array(
  z.object({
    monitored: z.boolean(),
    statistics: z
      .object({
        totalEpisodeCount: z.number().nonnegative(),
        episodeFileCount: z.number().nonnegative(),
        sizeOnDisk: z.number().nonnegative(),
      })
      .nullish(),
  }),
);
export const radarrLibrarySchema = z.array(
  z.object({
    monitored: z.boolean(),
    hasFile: z.boolean(),
    sizeOnDisk: z.number().nonnegative(),
  }),
);
export const monitoredLibrarySchema = z.array(z.object({ monitored: z.boolean() }));
export const sonarrCalendarSchema = z.array(
  z.object({
    title: z.string(),
    airDateUtc: date,
    seasonNumber: z.number().min(0),
    episodeNumber: z.number().min(0),
    series: z.object({
      overview: z.string().optional(),
      title: z.string(),
      titleSlug: z.string(),
      images: calendarImages,
      imdbId: z.string().optional(),
    }),
    images: calendarImages,
  }),
);
export const radarrCalendarSchema = z.array(
  z.object({
    title: z.string(),
    originalTitle: z.string(),
    inCinemas: date.optional(),
    physicalRelease: date.optional(),
    digitalRelease: date.optional(),
    overview: z.string().optional(),
    titleSlug: z.string(),
    images: calendarImages,
    imdbId: z.string().optional(),
  }),
);
export const lidarrCalendarSchema = z.array(
  z.object({
    title: z.string(),
    overview: z.string().optional(),
    images: z.array(z.object({ coverType: audioCoverType, remoteUrl: z.string().url() })),
    artist: z.object({
      links: z.array(z.object({ url: z.string().url(), name: z.string() })),
      artistName: z.string(),
      titleSlug: z.string().optional(),
    }),
    releaseDate: date,
  }),
);
export const readarrCalendarSchema = z.array(
  z.object({
    title: z.string(),
    overview: z.string().optional(),
    images: z.array(
      z.object({
        coverType: audioCoverType,
        url: z.string().transform((url) => url.replace(/\?lastWrite=[0-9]+/, "")),
      }),
    ),
    links: z.array(z.object({ name: z.string(), url: z.string() })),
    author: z.object({ authorName: z.string(), foreignAuthorId: z.string() }),
    releaseDate: date,
  }),
);
export const sonarrMissingSchema = z.object({
  totalRecords: z.number(),
  records: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      seasonNumber: z.number(),
      episodeNumber: z.number(),
      series: z.object({ title: z.string(), year: z.number().optional(), titleSlug: z.string(), images }).optional(),
    }),
  ),
});
export const sonarrQueueSchema = z.object({
  totalRecords: z.number(),
  records: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      status: z.string(),
      timeleft: z.string().optional(),
      size: z.number().optional(),
      sizeleft: z.number().optional(),
      series: z.object({ title: z.string(), titleSlug: z.string(), images }).optional(),
      episode: z.object({ title: z.string(), seasonNumber: z.number(), episodeNumber: z.number() }).optional(),
    }),
  ),
});
export const radarrMissingSchema = z.object({
  totalRecords: z.number(),
  records: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      year: z.number().optional(),
      titleSlug: z.string(),
      images,
    }),
  ),
});
export const radarrQueueSchema = z.object({
  totalRecords: z.number(),
  records: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      status: z.string(),
      timeleft: z.string().optional(),
      size: z.number().optional(),
      sizeleft: z.number().optional(),
      movie: z.object({ title: z.string(), year: z.number().optional(), titleSlug: z.string(), images }).optional(),
    }),
  ),
});
export const binderyMissingSchema = z.array(
  z.object({
    id: z.number(),
    title: z.string(),
    releaseDate: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    author: z.object({ authorName: z.string() }).optional(),
  }),
);
const binderyQueueItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  status: z.string(),
  percentage: z.string().optional(),
  timeLeft: z.string().optional().nullable(),
  book: z.object({ id: z.number().optional(), title: z.string(), authorName: z.string().optional() }).optional(),
});
export const binderyQueueSchema = z.union([
  z.array(binderyQueueItemSchema),
  z.object({ items: z.array(binderyQueueItemSchema) }),
]);
