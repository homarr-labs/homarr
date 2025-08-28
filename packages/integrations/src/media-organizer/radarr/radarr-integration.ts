import { z } from "zod/v4";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import type { AtLeastOneOf } from "@homarr/common/types";
import { logger } from "@homarr/log";

import { Integration } from "../../base/integration";
import type { IntegrationTestingInput } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { ICalendarIntegration } from "../../interfaces/calendar/calendar-integration";
import type { CalendarEvent } from "../../interfaces/calendar/calendar-types";
import { radarrReleaseTypes } from "../../interfaces/calendar/calendar-types";
import { mediaOrganizerPriorities } from "../media-organizer";

export class RadarrIntegration extends Integration implements ICalendarIntegration {
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

    return radarrCalendarEvents.map((radarrCalendarEvent): CalendarEvent => {
      const dates = radarrReleaseTypes
        .map((type) => (radarrCalendarEvent[type] ? { type, date: radarrCalendarEvent[type] } : undefined))
        .filter((date) => date) as AtLeastOneOf<Exclude<CalendarEvent["dates"], undefined>[number]>;
      return {
        name: radarrCalendarEvent.title,
        subName: radarrCalendarEvent.originalTitle,
        description: radarrCalendarEvent.overview,
        date: dates[0].date,
        dates,
        metadata: {
          type: "movie",
          thumbnail: this.chooseBestImageAsURL(radarrCalendarEvent),
        },
        links: this.getLinksForRadarrCalendarEvent(radarrCalendarEvent),
      };
    });
  }

  private getLinksForRadarrCalendarEvent = (event: z.infer<typeof radarrCalendarEventSchema>) => {
    const links: CalendarEvent["links"] = [
      {
        href: this.url(`/movie/${event.titleSlug}`).toString(),
        name: "Radarr",
        logo: "/images/apps/radarr.svg",
        color: undefined,
        notificationColor: "yellow",
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
