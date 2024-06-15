import { logger } from "@homarr/log";
import { z } from "@homarr/validation";

import { Integration } from "../../base/integration";
import type { CalendarEvent } from "../../calendar-types";

export class SonarrIntegration extends Integration {
  private readonly priorities: z.infer<typeof sonarCalendarEventSchema>["images"][number]["coverType"][] = [
    "screenshot",
    "poster",
    "banner",
    "fanart",
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
    url.searchParams.append("apiKey", super.getSecretValue("apiKey"));
    url.searchParams.append("start", start.toISOString());
    url.searchParams.append("end", end.toISOString());
    url.searchParams.append("includeSeries", "true");
    url.searchParams.append("includeEpisodeFile", "true");
    url.searchParams.append("includeEpisodeImages", "true");
    url.searchParams.append("unmonitored", includeUnmonitored ? "true" : "false");
    logger.info(start.toISOString() + ", " + end.toISOString() + ", " + url.toString());
    const response = await fetch(url);
    const sonarCalendarEvents = await z.array(sonarCalendarEventSchema).parseAsync(await response.json());

    return sonarCalendarEvents.map((sonarCalendarEvent): CalendarEvent => ({
      name: sonarCalendarEvent.title,
      description: sonarCalendarEvent.series.overview,
      thumbnail: this.chooseBestImageAsURL(sonarCalendarEvent.images),
      date: sonarCalendarEvent.airDateUtc,
      mediaInformation: {
        type: "tv",
        episodeNumber: sonarCalendarEvent.episodeNumber,
        seasonNumber: sonarCalendarEvent.seasonNumber,
      },
      links: [],
    }));
  }

  private chooseBestImage = (
    images: z.infer<typeof sonarCalendarEventSchema>["images"],
  ): z.infer<typeof sonarCalendarEventSchema>["images"][number] | undefined => {
    return images.sort(
      (imageA, imageB) => this.priorities.indexOf(imageA.coverType) - this.priorities.indexOf(imageB.coverType),
    )[0];
  };

  private chooseBestImageAsURL = (images: z.infer<typeof sonarCalendarEventSchema>["images"]): URL | undefined => {
    const bestImage = this.chooseBestImage(images);
    if (!bestImage) {
      return undefined;
    }
    return new URL(bestImage.remoteUrl);
  };
}

const sonarCalendarEventSchema = z.object({
  title: z.string(),
  airDateUtc: z.string().transform((value) => new Date(value)),
  seasonNumber: z.number().min(0),
  episodeNumber: z.number().min(0),
  series: z.object({
    overview: z.string(),
  }),
  images: z.array(
    z.object({
      coverType: z.enum(["screenshot", "poster", "banner", "fanart"]),
      remoteUrl: z.string().url(),
    }),
  ),
});
