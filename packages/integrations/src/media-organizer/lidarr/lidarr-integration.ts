import { logger } from "@homarr/log";
import { z } from "@homarr/validation";

import type { CalendarEvent } from "../../calendar-types";
import { MediaOrganizerIntegration } from "../media-organizer-integration";

export class LidarrIntegration extends MediaOrganizerIntegration {
  public async testConnectionAsync(): Promise<void> {
    await super.handleTestConnectionResponseAsync({
      queryFunctionAsync: async () => {
        return await fetch(`${this.integration.url}/api`, {
          headers: { "X-Api-Key": super.getSecretValue("apiKey") },
        });
      },
    });
  }

  /**
   * Gets the events in the Lidarr calendar between two dates.
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
    const lidarrCalendarEvents = await z.array(lidarrCalendarEventSchema).parseAsync(await response.json());

    return lidarrCalendarEvents.map((lidarrCalendarEvent): CalendarEvent => {
      return {
        name: lidarrCalendarEvent.title,
        subName: lidarrCalendarEvent.artist.artistName,
        description: lidarrCalendarEvent.overview,
        thumbnail: this.chooseBestImageAsURL(lidarrCalendarEvent),
        date: lidarrCalendarEvent.releaseDate,
        mediaInformation: {
          type: "audio",
        },
        links: this.getLinksForLidarrCalendarEvent(lidarrCalendarEvent),
      };
    });
  }

  private getLinksForLidarrCalendarEvent = (event: z.infer<typeof lidarrCalendarEventSchema>) => {
    const links: CalendarEvent["links"] = [];

    if (event.artist.links.some((link) => link.name === "vgmdb")) {
      links.push({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        href: event.artist.links.find((link) => link.name === "vgmdb")!.url,
        name: "VgmDB",
        color: "#f5c518",
        isDark: false,
        logo: "/images/apps/vgmdblogo.png",
        notificationColor: "cyan",
      });
    }

    if (event.artist.links.some((link) => link.name === "imdb")) {
      links.push({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        href: event.artist.links.find((link) => link.name === "imdb")!.url,
        name: "IMDb",
        color: "#f5c518",
        isDark: false,
        logo: "/images/apps/imdb.png",
        notificationColor: "cyan",
      });
    }

    if (event.artist.links.some((link) => link.name === "imvdb")) {
      links.push({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        href: event.artist.links.find((link) => link.name === "imvdb")!.url,
        name: "IMVDb",
        color: "#BA478F",
        isDark: false,
        logo: "/images/apps/imvdb.jpg",
        notificationColor: "cyan",
      });
    }

    if (event.artist.links.some((link) => link.name === "last")) {
      links.push({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        href: event.artist.links.find((link) => link.name === "last")!.url,
        name: "LastFM",
        color: "#cf222a",
        isDark: false,
        logo: "/images/apps/last.jpg",
        notificationColor: "cyan",
      });
    }

    return links;
  };

  private chooseBestImage = (
    event: z.infer<typeof lidarrCalendarEventSchema>,
  ): z.infer<typeof lidarrCalendarEventSchema>["images"][number] | undefined => {
    const flatImages = [...event.images];

    const sortedImages = flatImages.sort(
      (imageA, imageB) => this.priorities.indexOf(imageA.coverType) - this.priorities.indexOf(imageB.coverType),
    );
    logger.debug(`Sorted images to [${sortedImages.map((image) => image.coverType).join(",")}]`);
    return sortedImages[0];
  };

  private chooseBestImageAsURL = (event: z.infer<typeof lidarrCalendarEventSchema>): string | undefined => {
    const bestImage = this.chooseBestImage(event);
    if (!bestImage) {
      return undefined;
    }
    return bestImage.remoteUrl;
  };
}

const lidarrCalendarEventImageSchema = z.array(
  z.object({
    coverType: z.enum(["screenshot", "poster", "banner", "fanart", "clearlogo", "cover"]),
    remoteUrl: z.string().url(),
  }),
);

const lidarrCalendarEventSchema = z.object({
  title: z.string(),
  overview: z.string().optional(),
  images: lidarrCalendarEventImageSchema,
  artist: z.object({ links: z.array(z.object({ url: z.string().url(), name: z.string() })), artistName: z.string() }),
  releaseDate: z.string().transform((value) => new Date(value)),
});
