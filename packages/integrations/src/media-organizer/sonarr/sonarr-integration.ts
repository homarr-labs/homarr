import { z } from "zod/v4";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

import { Integration } from "../../base/integration";
import type { IntegrationTestingInput } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { ICalendarIntegration } from "../../interfaces/calendar/calendar-integration";
import type { CalendarEvent, CalendarLink } from "../../interfaces/calendar/calendar-types";
import type { IMediaOrganizerIntegration } from "../../interfaces/media-organizer/media-organizer-integration";
import type { MissingMediaItem, QueuedMediaItem } from "../../interfaces/media-organizer/media-organizer-types";
import { mediaOrganizerPriorities } from "../media-organizer";

const logger = createLogger({ module: "sonarrIntegration" });

export class SonarrIntegration extends Integration implements ICalendarIntegration, IMediaOrganizerIntegration {
  /**
   * Gets the events in the Sonarr calendar between two dates.
   * @param start The start date
   * @param end The end date
   * @param includeUnmonitored When true results will include unmonitored items of the Sonarr library.
   */
  async getCalendarEventsAsync(start: Date, end: Date, includeUnmonitored = true): Promise<CalendarEvent[]> {
    const url = this.url("/api/v3/calendar", {
      start,
      end,
      unmonitored: includeUnmonitored,
      includeSeries: true,
      includeEpisodeFile: true,
      includeEpisodeImages: true,
    });

    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: {
        "X-Api-Key": super.getSecretValue("apiKey"),
      },
    });
    const sonarrCalendarEvents = await z.array(sonarrCalendarEventSchema).parseAsync(await response.json());

    return sonarrCalendarEvents.map((event): CalendarEvent => {
      const imageSrc = this.chooseBestImageAsURL(event);
      return {
        title: event.title,
        subTitle: event.series.title,
        description: event.series.overview ?? null,
        startDate: event.airDateUtc,
        endDate: null,
        image: imageSrc
          ? {
              src: imageSrc,
              aspectRatio: { width: 7, height: 12 },
              badge: {
                color: "red",
                content: `S${event.seasonNumber}/E${event.episodeNumber}`,
              },
            }
          : null,
        location: null,
        indicatorColor: "blue",
        links: this.getLinksForSonarrCalendarEvent(event),
      };
    });
  }

  private getLinksForSonarrCalendarEvent = (event: z.infer<typeof sonarrCalendarEventSchema>) => {
    const links: CalendarLink[] = [
      {
        href: this.externalUrl(`/series/${event.series.titleSlug}`).toString(),
        name: "Sonarr",
        logo: "/images/apps/sonarr.svg",
        color: undefined,
        isDark: true,
      },
    ];

    if (event.series.imdbId) {
      links.push({
        href: `https://www.imdb.com/title/${event.series.imdbId}/`,
        name: "IMDb",
        color: "#f5c518",
        isDark: false,
        logo: "/images/apps/imdb.svg",
      });
    }

    return links;
  };

  private chooseBestImage = (
    event: z.infer<typeof sonarrCalendarEventSchema>,
  ): z.infer<typeof sonarrCalendarEventSchema>["images"][number] | undefined => {
    const flatImages = [...event.images, ...event.series.images];

    const sortedImages = flatImages.sort(
      (imageA, imageB) =>
        mediaOrganizerPriorities.indexOf(imageA.coverType) - mediaOrganizerPriorities.indexOf(imageB.coverType),
    );
    logger.debug(`Sorted images to [${sortedImages.map((image) => image.coverType).join(",")}]`);
    return sortedImages[0];
  };

  private chooseBestImageAsURL = (event: z.infer<typeof sonarrCalendarEventSchema>): string | undefined => {
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
      sortKey: "airDateUtc",
      sortDirection: "ascending",
      includeSeries: true,
    });

    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: { "X-Api-Key": super.getSecretValue("apiKey") },
    });
    const data = await z
      .object({
        totalRecords: z.number(),
        records: z.array(sonarrMissingEpisodeSchema),
      })
      .parseAsync(await response.json());

    return {
      totalCount: data.totalRecords,
      items: data.records.map(
        (episode): MissingMediaItem => ({
          id: episode.id,
          title: episode.title,
          type: "episode",
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          seriesTitle: episode.series?.title,
          year: episode.series?.year,
          imageUrl: episode.series?.images.find((img) => img.coverType === "poster")?.remoteUrl ?? null,
          link: episode.series?.titleSlug
            ? this.externalUrl(`/series/${episode.series.titleSlug}`).toString()
            : this.externalUrl("/wanted/missing").toString(),
        }),
      ),
    };
  }

  async getMediaQueueAsync(pageSize = 10): Promise<{ items: QueuedMediaItem[]; totalCount: number }> {
    const url = this.url("/api/v3/queue", {
      page: 1,
      pageSize,
      includeSeries: true,
      includeEpisode: true,
    });

    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: { "X-Api-Key": super.getSecretValue("apiKey") },
    });
    const data = await z
      .object({
        totalRecords: z.number(),
        records: z.array(sonarrQueueItemSchema),
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
          title: item.episode?.title ?? item.title,
          type: "episode",
          status: item.status,
          timeLeft: item.timeleft ?? null,
          percentComplete,
          seasonNumber: item.episode?.seasonNumber,
          episodeNumber: item.episode?.episodeNumber,
          seriesTitle: item.series?.title,
          imageUrl: item.series?.images.find((img) => img.coverType === "poster")?.remoteUrl ?? null,
          link: item.series?.titleSlug
            ? this.externalUrl(`/series/${item.series.titleSlug}`).toString()
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

const sonarrMissingEpisodeSchema = z.object({
  id: z.number(),
  title: z.string(),
  seasonNumber: z.number(),
  episodeNumber: z.number(),
  series: z
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

const sonarrQueueItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  status: z.string(),
  timeleft: z.string().optional(),
  size: z.number().optional(),
  sizeleft: z.number().optional(),
  series: z
    .object({
      title: z.string(),
      titleSlug: z.string(),
      images: z.array(
        z.object({
          coverType: z.string(),
          remoteUrl: z.string().url(),
        }),
      ),
    })
    .optional(),
  episode: z
    .object({
      title: z.string(),
      seasonNumber: z.number(),
      episodeNumber: z.number(),
    })
    .optional(),
});

const sonarrCalendarEventImageSchema = z.array(
  z.object({
    // See https://github.com/Sonarr/Sonarr/blob/9e5ebdc6245d4714776b53127a1e6b63c25fbcb9/src/NzbDrone.Core/MediaCover/MediaCover.cs#L5-L14
    coverType: z.enum(["unknown", "poster", "banner", "fanart", "screenshot", "headshot", "clearlogo"]),
    remoteUrl: z.string().url(),
  }),
);

const sonarrCalendarEventSchema = z.object({
  title: z.string(),
  airDateUtc: z.string().transform((value) => new Date(value)),
  seasonNumber: z.number().min(0),
  episodeNumber: z.number().min(0),
  series: z.object({
    overview: z.string().optional(),
    title: z.string(),
    titleSlug: z.string(),
    images: sonarrCalendarEventImageSchema,
    imdbId: z.string().optional(),
  }),
  images: sonarrCalendarEventImageSchema,
});
