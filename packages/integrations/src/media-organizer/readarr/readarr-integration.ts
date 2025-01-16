import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { logger } from "@homarr/log";
import { z } from "@homarr/validation";

import type { CalendarEvent } from "../../calendar-types";
import { MediaOrganizerIntegration } from "../media-organizer-integration";

export class ReadarrIntegration extends MediaOrganizerIntegration {
  public async testConnectionAsync(): Promise<void> {
    await super.handleTestConnectionResponseAsync({
      queryFunctionAsync: async () => {
        return await fetchWithTrustedCertificatesAsync(this.url("/api"), {
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
  async getCalendarEventsAsync(
    start: Date,
    end: Date,
    includeUnmonitored = true,
    includeAuthor = true,
  ): Promise<CalendarEvent[]> {
    const url = this.url("/api/v1/calendar", {
      start,
      end,
      unmonitored: includeUnmonitored,
      includeAuthor,
    });

    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: {
        "X-Api-Key": super.getSecretValue("apiKey"),
      },
    });
    const readarrCalendarEvents = await z.array(readarrCalendarEventSchema).parseAsync(await response.json());

    return readarrCalendarEvents.map((readarrCalendarEvent): CalendarEvent => {
      return {
        name: readarrCalendarEvent.title,
        subName: readarrCalendarEvent.author.authorName,
        description: readarrCalendarEvent.overview,
        thumbnail: this.chooseBestImageAsURL(readarrCalendarEvent),
        date: readarrCalendarEvent.releaseDate,
        mediaInformation: {
          type: "audio",
        },
        links: this.getLinksForReadarrCalendarEvent(readarrCalendarEvent),
      };
    });
  }

  private getLinksForReadarrCalendarEvent = (event: z.infer<typeof readarrCalendarEventSchema>) => {
    return [
      {
        href: this.url(`/author/${event.author.foreignAuthorId}`).toString(),
        color: "#f5c518",
        isDark: false,
        logo: "/images/apps/readarr.svg",
        name: "Readarr",
        notificationColor: "#f5c518",
      },
    ] satisfies CalendarEvent["links"];
  };

  private chooseBestImage = (
    event: z.infer<typeof readarrCalendarEventSchema>,
  ): z.infer<typeof readarrCalendarEventSchema>["images"][number] | undefined => {
    const flatImages = [...event.images];

    const sortedImages = flatImages.sort(
      (imageA, imageB) => this.priorities.indexOf(imageA.coverType) - this.priorities.indexOf(imageB.coverType),
    );
    logger.debug(`Sorted images to [${sortedImages.map((image) => image.coverType).join(",")}]`);
    return sortedImages[0];
  };

  private chooseBestImageAsURL = (event: z.infer<typeof readarrCalendarEventSchema>): string | undefined => {
    const bestImage = this.chooseBestImage(event);
    if (!bestImage) {
      return undefined;
    }
    return this.url(bestImage.url as `/${string}`).toString();
  };
}

const readarrCalendarEventImageSchema = z.array(
  z.object({
    coverType: z.enum(["screenshot", "poster", "banner", "fanart", "clearlogo", "cover"]),
    url: z.string().transform((url) => url.replace(/\?lastWrite=[0-9]+/, "")), // returns a random string, needs to be removed for loading the image
  }),
);

const readarrCalendarEventSchema = z.object({
  title: z.string(),
  overview: z.string().optional(),
  images: readarrCalendarEventImageSchema,
  links: z.array(
    z.object({
      name: z.string(),
      url: z.string(),
    }),
  ),
  author: z.object({
    authorName: z.string(),
    foreignAuthorId: z.string(),
  }),
  releaseDate: z.string().transform((value) => new Date(value)),
});
