import { z } from "zod/v4";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { IntegrationTestingInput } from "../../base/integration";
import { Integration } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { ICalendarIntegration } from "../../interfaces/calendar/calendar-integration";
import type { CalendarEvent, CalendarLink } from "../../interfaces/calendar/calendar-types";
import { radarrReleaseTypes } from "../../interfaces/calendar/calendar-types";
import type { IMediaOrganizerIntegration } from "../../interfaces/media-organizer/media-organizer-integration";
import type { MissingMediaItem, QueuedMediaItem } from "../../interfaces/media-organizer/media-organizer-types";
import { mediaOrganizerPriorities } from "../media-organizer";

const logger = createLogger({ module: "radarrIntegration" });

export class RadarrIntegration extends Integration implements ICalendarIntegration, IMediaOrganizerIntegration {
  /**
   * Gets the events in the Radarr calendar between two dates.
   * @param start The start date
   * @param end The end date
   * @param includeUnmonitored When true results will include unmonitored items of the Tadarr library.
   */
  async getCalendarEventsAsync(start: Date, end: Date, includeUnmonitored = true): Promise<CalendarEvent[]> {
    const url = this.url("/api/v3/calendar", {
      start,
      end,
      unmonitored: includeUnmonitored,
    });

    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: {
        "X-Api-Key": super.getSecretValue("apiKey"),
      },
    });
    const radarrCalendarEvents = await z.array(radarrCalendarEventSchema).parseAsync(await response.json());

    return radarrCalendarEvents.flatMap((radarrCalendarEvent): CalendarEvent[] => {
      const imageSrc = this.chooseBestImageAsURL(radarrCalendarEvent);

      return radarrReleaseTypes
        .map((releaseType) => ({ type: releaseType, date: radarrCalendarEvent[releaseType] }))
        .filter((item) => item.date !== undefined)
        .map((item) => ({
          title: radarrCalendarEvent.title,
          subTitle: radarrCalendarEvent.originalTitle,
          description: radarrCalendarEvent.overview ?? null,
          // Check is done above in the filter
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          startDate: item.date!,
          endDate: null,
          image: imageSrc
            ? {
                src: imageSrc,
                aspectRatio: { width: 7, height: 12 },
              }
            : null,
          location: null,
          metadata: {
            type: "radarr",
            releaseType: item.type,
          },
          indicatorColor: "yellow",
          links: this.getLinksForRadarrCalendarEvent(radarrCalendarEvent),
        }));
    });
  }

  private getLinksForRadarrCalendarEvent = (event: z.infer<typeof radarrCalendarEventSchema>) => {
    const links: CalendarLink[] = [
      {
        href: this.externalUrl(`/movie/${event.titleSlug}`).toString(),
        name: "Radarr",
        logo: "/images/apps/radarr.svg",
        color: undefined,
        isDark: true,
      },
    ];

    if (event.imdbId) {
      links.push({
        href: `https://www.imdb.com/title/${event.imdbId}/`,
        name: "IMDb",
        color: "#f5c518",
        isDark: false,
        logo: "/images/apps/imdb.svg",
      });
    }

    return links;
  };

  private chooseBestImage = (
    event: z.infer<typeof radarrCalendarEventSchema>,
  ): z.infer<typeof radarrCalendarEventSchema>["images"][number] | undefined => {
    const flatImages = [...event.images];

    const sortedImages = flatImages.sort(
      (imageA, imageB) =>
        mediaOrganizerPriorities.indexOf(imageA.coverType) - mediaOrganizerPriorities.indexOf(imageB.coverType),
    );
    logger.debug(`Sorted images to [${sortedImages.map((image) => image.coverType).join(",")}]`);
    return sortedImages[0];
  };

  private chooseBestImageAsURL = (event: z.infer<typeof radarrCalendarEventSchema>): string | undefined => {
    const bestImage = this.chooseBestImage(event);
    if (!bestImage) {
      return undefined;
    }
    return bestImage.remoteUrl;
  };

  async getMissingAsync(pageSize = 10): Promise<{ items: MissingMediaItem[]; totalCount: number }> {
    const url = this.url("/api/v3/wanted/missing", {
      page: 1,
      pageSize,
      sortKey: "title",
      sortDirection: "ascending",
    });

    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: { "X-Api-Key": super.getSecretValue("apiKey") },
    });
    const data = await z
      .object({
        totalRecords: z.number(),
        records: z.array(radarrMissingMovieSchema),
      })
      .parseAsync(await response.json());

    return {
      totalCount: data.totalRecords,
      items: data.records.map(
        (movie): MissingMediaItem => ({
          id: movie.id,
          title: movie.title,
          type: "movie",
          year: movie.year,
          imageUrl: movie.images.find((img) => img.coverType === "poster")?.remoteUrl ?? null,
          link: this.externalUrl(`/movie/${movie.titleSlug}`).toString(),
        }),
      ),
    };
  }

  async getMediaQueueAsync(pageSize = 10): Promise<{ items: QueuedMediaItem[]; totalCount: number }> {
    const url = this.url("/api/v3/queue", {
      page: 1,
      pageSize,
      includeMovie: true,
    });

    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: { "X-Api-Key": super.getSecretValue("apiKey") },
    });
    const data = await z
      .object({
        totalRecords: z.number(),
        records: z.array(radarrQueueItemSchema),
      })
      .parseAsync(await response.json());

    return {
      totalCount: data.totalRecords,
      items: data.records.map((item): QueuedMediaItem => {
        const sizeLeft = item.sizeleft ?? 0;
        const sizeTotal = item.size ?? 0;
        const percentComplete = sizeTotal > 0 ? Math.round(((sizeTotal - sizeLeft) / sizeTotal) * 100) : 0;
        return {
          id: item.id,
          title: item.movie?.title ?? item.title,
          type: "movie",
          status: item.status,
          timeLeft: item.timeleft ?? null,
          percentComplete,
          year: item.movie?.year,
          imageUrl: item.movie?.images.find((img) => img.coverType === "poster")?.remoteUrl ?? null,
          link: item.movie?.titleSlug
            ? this.externalUrl(`/movie/${item.movie.titleSlug}`).toString()
            : this.externalUrl("/activity/queue").toString(),
        };
      }),
    };
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api"), {
      headers: { "X-Api-Key": super.getSecretValue("apiKey") },
    });

    if (!response.ok) return TestConnectionError.StatusResult(response);

    await response.json();
    return { success: true };
  }
}

const radarrCalendarEventImageSchema = z.array(
  z.object({
    // See https://github.com/Radarr/Radarr/blob/a3b1512552a8a5bc0c0d399d961ccbf0dba97749/src/NzbDrone.Core/MediaCover/MediaCover.cs#L6-L15
    coverType: z.enum(["unknown", "poster", "banner", "fanart", "screenshot", "headshot", "clearlogo"]),
    remoteUrl: z.string().url(),
  }),
);

const radarrMissingMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  year: z.number().optional(),
  titleSlug: z.string(),
  images: z.array(
    z.object({
      coverType: z.string(),
      remoteUrl: z.string().url(),
    }),
  ),
});

const radarrQueueItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  status: z.string(),
  timeleft: z.string().optional(),
  size: z.number().optional(),
  sizeleft: z.number().optional(),
  movie: z
    .object({
      title: z.string(),
      year: z.number().optional(),
      titleSlug: z.string(),
      images: z.array(
        z.object({
          coverType: z.string(),
          remoteUrl: z.string().url(),
        }),
      ),
    })
    .optional(),
});

const radarrCalendarEventSchema = z.object({
  title: z.string(),
  originalTitle: z.string(),
  inCinemas: z
    .string()
    .transform((value) => new Date(value))
    .optional(),
  physicalRelease: z
    .string()
    .transform((value) => new Date(value))
    .optional(),
  digitalRelease: z
    .string()
    .transform((value) => new Date(value))
    .optional(),
  overview: z.string().optional(),
  titleSlug: z.string(),
  images: radarrCalendarEventImageSchema,
  imdbId: z.string().optional(),
});
