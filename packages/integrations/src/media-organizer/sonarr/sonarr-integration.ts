import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { logger } from "@homarr/log";
import { z } from "@homarr/validation";

import type { CalendarEvent } from "../../calendar-types";
import { MediaOrganizerIntegration } from "../media-organizer-integration";

export class SonarrIntegration extends MediaOrganizerIntegration {
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
    const sonarCalendarEvents = await z.array(sonarrCalendarEventSchema).parseAsync(await response.json());

    return sonarCalendarEvents.map(
      (sonarCalendarEvent): CalendarEvent => ({
        name: sonarCalendarEvent.title,
        subName: sonarCalendarEvent.series.title,
        description: sonarCalendarEvent.series.overview,
        thumbnail: this.chooseBestImageAsURL(sonarCalendarEvent),
        date: sonarCalendarEvent.airDateUtc,
        mediaInformation: {
          type: "tv",
          episodeNumber: sonarCalendarEvent.episodeNumber,
          seasonNumber: sonarCalendarEvent.seasonNumber,
        },
        links: this.getLinksForSonarCalendarEvent(sonarCalendarEvent),
      }),
    );
  }

  private getLinksForSonarCalendarEvent = (event: z.infer<typeof sonarrCalendarEventSchema>) => {
    const links: CalendarEvent["links"] = [
      {
        href: this.url(`/series/${event.series.titleSlug}`).toString(),
        name: "Sonarr",
        logo: "/images/apps/sonarr.svg",
        color: undefined,
        notificationColor: "blue",
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
      (imageA, imageB) => this.priorities.indexOf(imageA.coverType) - this.priorities.indexOf(imageB.coverType),
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

  public async testConnectionAsync(): Promise<void> {
    await super.handleTestConnectionResponseAsync({
      queryFunctionAsync: async () => {
        return await fetchWithTrustedCertificatesAsync(this.url("/api"), {
          headers: { "X-Api-Key": super.getSecretValue("apiKey") },
        });
      },
    });
  }
}

const sonarrCalendarEventImageSchema = z.array(
  z.object({
    coverType: z.enum(["screenshot", "poster", "banner", "fanart", "clearlogo"]),
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
