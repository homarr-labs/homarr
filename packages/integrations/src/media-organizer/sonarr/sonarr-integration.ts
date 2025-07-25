import { z } from "zod";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { logger } from "@homarr/log";

import { Integration } from "../../base/integration";
import type { IntegrationTestingInput } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { ICalendarIntegration } from "../../interfaces/calendar/calendar-integration";
import type { CalendarEvent } from "../../interfaces/calendar/calendar-types";
import { mediaOrganizerPriorities } from "../media-organizer";

export class SonarrIntegration extends Integration implements ICalendarIntegration {
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

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api"), {
      headers: { "X-Api-Key": super.getSecretValue("apiKey") },
    });

    if (!response.ok) return TestConnectionError.StatusResult(response);

    await response.json();
    return { success: true };
  }
}

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
