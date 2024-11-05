import { logger } from "@homarr/log";
import { z } from "@homarr/validation";

import { Integration } from "../../base/integration";
import type { CalendarEvent } from "../../calendar-types";

export class LidarrIntegration extends Integration {
  /**
   * Priority list that determines the quality of images using their order.
   * Types at the start of the list are better than those at the end.
   * We do this to attempt to find the best quality image for the show.
   */
  private readonly priorities: z.infer<typeof radarrCalendarEventSchema>["images"][number]["coverType"][] = [
    "cover", // Official, perfect aspect ratio
    "poster", // Official, perfect aspect ratio
    "banner", // Official, bad aspect ratio
    "fanart", // Unofficial, possibly bad quality
    "screenshot", // Bad aspect ratio, possibly bad quality
    "clearlogo", // Without background, bad aspect ratio
  ];

  public async testConnectionAsync(): Promise<void> {
    await super.handleTestConnectionResponseAsync({
      queryFunctionAsync: async () => {
        return await fetch(`${this.integration.url}/api`, {
          headers: { "X-Api-Key": super.getSecretValue("apiKey") },
        });
      },
    });
  }

  private getLinksForRadarrCalendarEvent = (event: z.infer<typeof radarrCalendarEventSchema>) => {
    const links: CalendarEvent["links"] = [];

    if (event.artist.links.some(link => link.name === "vgmdb")) {
      links.push({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        href: event.artist.links.find(link => link.name === "vgmdb")!.url,
        name: "VgmDB",
        color: "#f5c518",
        isDark: false,
        logo: "/images/apps/imdb.png",
        notificationColor: "cyan"
      });
    }

    if (event.artist.links.some(link => link.name === "imdb")) {
      links.push({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        href: event.artist.links.find(link => link.name === "imdb")!.url,
        name: "IMDb",
        color: "#f5c518",
        isDark: false,
        logo: "/images/apps/imdb.png",
        notificationColor: "cyan"
      });
    }

    if (event.artist.links.some(link => link.name === "imvdb")) {
      links.push({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        href: event.artist.links.find(link => link.name === "imvdb")!.url,
        name: "IMVDb",
        color: "#BA478F",
        isDark: false,
        logo: "/images/apps/imvdb.png",
        notificationColor: "cyan"
      });
    }

    if (event.artist.links.some(link => link.name === "last")) {
      links.push({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        href: event.artist.links.find(link => link.name === "last")!.url,
        name: "LastFM",
        color: "#cf222a",
        isDark: false,
        logo: "/images/apps/last.png",
        notificationColor: "cyan"
      });
    }

    return links;
  };

  private chooseBestImage = (
    event: z.infer<typeof radarrCalendarEventSchema>,
  ): z.infer<typeof radarrCalendarEventSchema>["images"][number] | undefined => {
    const flatImages = [...event.images];

    const sortedImages = flatImages.sort(
      (imageA, imageB) => this.priorities.indexOf(imageA.coverType) - this.priorities.indexOf(imageB.coverType),
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

  /**
   * Gets the events in the Radarr calendar between two dates.
   * @param start The start date
   * @param end The end date
   * @param includeUnmonitored When true results will include unmonitored items of the Tadarr library.
   */
  async getCalendarEventsAsync(start: Date, end: Date, includeUnmonitored = true): Promise<CalendarEvent[]> {
    const url = new URL(this.integration.url);
    url.pathname = "/api/v1/calendar";
    url.searchParams.append("start", start.toISOString());
    url.searchParams.append("end", end.toISOString());
    url.searchParams.append("unmonitored", includeUnmonitored ? "true" : "false");
    const response = await fetch(url, {
      headers: {
        "X-Api-Key": super.getSecretValue("apiKey"),
      },
    });
    const radarrCalendarEvents = await z.array(radarrCalendarEventSchema).parseAsync(await response.json());

    return radarrCalendarEvents.map((radarrCalendarEvent): CalendarEvent => {
      return {
        name: radarrCalendarEvent.title,
        subName: radarrCalendarEvent.artist.artistName,
        description: radarrCalendarEvent.overview,
        thumbnail: this.chooseBestImageAsURL(radarrCalendarEvent),
        date: radarrCalendarEvent.releaseDate,
        mediaInformation: {
          type: "audio",
        },
        links: this.getLinksForRadarrCalendarEvent(radarrCalendarEvent),
      };
    });
  }
}

const radarrCalendarEventImageSchema = z.array(
  z.object({
    coverType: z.enum(["screenshot", "poster", "banner", "fanart", "clearlogo", "cover"]),
    remoteUrl: z.string().url(),
  }),
);

const radarrCalendarEventSchema = z.object({
  title: z.string(),
  overview: z.string().optional(),
  images: radarrCalendarEventImageSchema,
  artist: z.object({ links: z.array(z.object({ url: z.string().url(), name: z.string() })), artistName: z.string() }),
  releaseDate: z.string().transform((value) => new Date(value)),
});
