import { appendPath } from "@homarr/common";
import { logger } from "@homarr/log";
import { z } from "@homarr/validation";

import { Integration } from "../../base/integration";
import type { CalendarEvent } from "../../calendar-types";

export class SonarrIntegration extends Integration {
  /**
   * Priority list that determines the quality of images using their order.
   * Types at the start of the list are better than those at the end.
   * We do this to attempt to find the best quality image for the show.
   */
  private readonly priorities: z.infer<typeof sonarrCalendarEventSchema>["images"][number]["coverType"][] = [
    "poster", // Official, perfect aspect ratio
    "banner", // Official, bad aspect ratio
    "fanart", // Unofficial, possibly bad quality
    "screenshot", // Bad aspect ratio, possibly bad quality
    "clearlogo", // Without background, bad aspect ratio
  ];

  /**
   * Gets the events in the Sonarr calendar between two dates.
   * @param start The start date
   * @param end The end date
   * @param includeUnmonitored When true results will include unmonitored items of the Sonarr library.
   */
  async getCalendarEventsAsync(start: Date, end: Date, includeUnmonitored = true): Promise<CalendarEvent[]> {
    const url = new URL(this.integration.url);
    url.pathname = "/api/v3/calendar";
    url.searchParams.append("start", start.toISOString());
    url.searchParams.append("end", end.toISOString());
    url.searchParams.append("includeSeries", "true");
    url.searchParams.append("includeEpisodeFile", "true");
    url.searchParams.append("includeEpisodeImages", "true");
    url.searchParams.append("unmonitored", includeUnmonitored ? "true" : "false");
    const response = await fetch(url, {
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
        href: `${this.integration.url}/series/${event.series.titleSlug}`,
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
        logo: "/images/apps/imdb.png",
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
        return await fetch(appendPath(this.integration.url, "/api/ping"), {
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
