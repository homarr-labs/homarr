import type { z } from "zod/v4";

import { apiKeyAuth } from "../../http-auth";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { CalendarEvent, CalendarLink } from "../../interfaces/calendar/calendar-types";
import { radarrReleaseTypes } from "../../interfaces/calendar/calendar-types";
import type { MissingMediaItem, QueuedMediaItem } from "../../interfaces/media-organizer/media-organizer-types";
import { mediaOrganizerPriorities } from "../../media-organizer/media-organizer";
import { MediaHttpClient } from "./http";
import type { MediaHttpOperation, MediaPublic } from "./http";
import {
  binderyMissingSchema,
  binderyQueueSchema,
  lidarrCalendarSchema,
  monitoredLibrarySchema,
  radarrCalendarSchema,
  radarrLibrarySchema,
  radarrMissingSchema,
  radarrQueueSchema,
  readarrCalendarSchema,
  sonarrCalendarSchema,
  sonarrLibrarySchema,
  sonarrMissingSchema,
  sonarrQueueSchema,
} from "./organizer-schemas";

abstract class ApiKeyOrganizerClient extends MediaHttpClient {
  override async getHttpAuthenticationAsync() {
    this.resources.context.signal.throwIfAborted();
    return apiKeyAuth(this.integration);
  }

  protected readAsync<T>(http: MediaHttpOperation, url: URL, schema: z.ZodType<T>, libraryName?: string) {
    return http.responseAsync(url, { headers: { "X-Api-Key": this.secret("apiKey") } }, async (response) => {
      if (libraryName && !response.ok) throw new Error(`${libraryName} library request failed (${response.status})`);
      return await schema.parseAsync(await response.json());
    });
  }

  protected testingAsync(http: MediaHttpOperation) {
    return http.responseAsync(
      this.url("/api"),
      { headers: { "X-Api-Key": this.secret("apiKey") } },
      async (response) => {
        if (!response.ok) return TestConnectionError.StatusResult(response);
        await response.json();
        return { success: true } as const;
      },
    );
  }

  protected bestImage<T extends { coverType: string }>(images: T[]) {
    const sorted = images.toSorted(
      (a, b) => mediaOrganizerPriorities.indexOf(a.coverType) - mediaOrganizerPriorities.indexOf(b.coverType),
    );
    this.resources.log?.write("debug", "media-organizer.images.sorted", {
      coverTypes: sorted.map((image) => image.coverType).join(","),
    });
    return sorted[0];
  }

  protected imdbLinks(links: CalendarLink[], imdbId: string | undefined) {
    if (imdbId)
      links.push({
        href: `https://www.imdb.com/title/${imdbId}/`,
        name: "IMDb",
        color: "#f5c518",
        isDark: false,
        logo: "/images/apps/imdb.svg",
      });
    return links;
  }
}

export class SonarrMediaClient extends ApiKeyOrganizerClient implements MediaPublic<"sonarr"> {
  async getLibraryStatsAsync() {
    return this.runAsync(async (http) => {
      const library = await this.readAsync(http, this.url("/api/v3/series"), sonarrLibrarySchema, "Sonarr");
      return {
        shows: library.length,
        monitored: library.filter((item) => item.monitored).length,
        episodes: library.reduce((sum, item) => sum + (item.statistics?.totalEpisodeCount ?? 0), 0),
        downloaded: library.reduce((sum, item) => sum + (item.statistics?.episodeFileCount ?? 0), 0),
        storage: library.reduce((sum, item) => sum + (item.statistics?.sizeOnDisk ?? 0), 0),
      };
    });
  }

  async getCalendarEventsAsync(start: Date, end: Date, includeUnmonitored = true): Promise<CalendarEvent[]> {
    return this.runAsync(async (http) => {
      const events = await this.readAsync(
        http,
        this.url("/api/v3/calendar", {
          start,
          end,
          unmonitored: includeUnmonitored,
          includeSeries: true,
          includeEpisodeFile: true,
          includeEpisodeImages: true,
        }),
        sonarrCalendarSchema,
      );
      return events.map((event): CalendarEvent => {
        const src = this.bestImage([...event.images, ...event.series.images])?.remoteUrl;
        return {
          title: event.title,
          subTitle: event.series.title,
          description: event.series.overview ?? null,
          startDate: event.airDateUtc,
          endDate: null,
          image: src
            ? {
                src,
                aspectRatio: { width: 7, height: 12 },
                badge: { color: "red", content: `S${event.seasonNumber}/E${event.episodeNumber}` },
              }
            : null,
          location: null,
          indicatorColor: "blue",
          links: this.imdbLinks(
            [
              {
                href: this.externalUrl(`/series/${event.series.titleSlug}`).toString(),
                name: "Sonarr",
                logo: "/images/apps/sonarr.svg",
                color: undefined,
                isDark: true,
              },
            ],
            event.series.imdbId,
          ),
        };
      });
    });
  }

  async getMissingAsync(pageSize = 10): Promise<{ items: MissingMediaItem[]; totalCount: number }> {
    return this.runAsync(async (http) => {
      const data = await this.readAsync(
        http,
        this.url("/api/v3/wanted/missing", {
          page: 1,
          pageSize,
          sortKey: "airDateUtc",
          sortDirection: "ascending",
          includeSeries: true,
        }),
        sonarrMissingSchema,
      );
      return {
        totalCount: data.totalRecords,
        items: data.records.map((episode): MissingMediaItem => ({
          id: episode.id,
          title: episode.title,
          type: "episode",
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          seriesTitle: episode.series?.title,
          year: episode.series?.year,
          imageUrl: episode.series?.images.find((image) => image.coverType === "poster")?.remoteUrl ?? null,
          link: episode.series?.titleSlug
            ? this.externalUrl(`/series/${episode.series.titleSlug}`).toString()
            : this.externalUrl("/wanted/missing").toString(),
        })),
      };
    });
  }

  async getMediaQueueAsync(pageSize = 10): Promise<{ items: QueuedMediaItem[]; totalCount: number }> {
    return this.runAsync(async (http) => {
      const data = await this.readAsync(
        http,
        this.url("/api/v3/queue", { page: 1, pageSize, includeSeries: true, includeEpisode: true }),
        sonarrQueueSchema,
      );
      return {
        totalCount: data.totalRecords,
        items: data.records.map((item): QueuedMediaItem => {
          const size = item.size ?? 0;
          return {
            id: item.id,
            title: item.episode?.title ?? item.title,
            type: "episode",
            status: item.status,
            timeLeft: item.timeleft ?? null,
            percentComplete: size > 0 ? Math.round(((size - (item.sizeleft ?? 0)) / size) * 100) : 0,
            seasonNumber: item.episode?.seasonNumber,
            episodeNumber: item.episode?.episodeNumber,
            seriesTitle: item.series?.title,
            imageUrl: item.series?.images.find((image) => image.coverType === "poster")?.remoteUrl ?? null,
            link: item.series?.titleSlug
              ? this.externalUrl(`/series/${item.series.titleSlug}`).toString()
              : this.externalUrl("/activity/queue").toString(),
          };
        }),
      };
    });
  }
}

export class RadarrMediaClient extends ApiKeyOrganizerClient implements MediaPublic<"radarr"> {
  async getLibraryStatsAsync() {
    return this.runAsync(async (http) => {
      const library = await this.readAsync(http, this.url("/api/v3/movie"), radarrLibrarySchema, "Radarr");
      return {
        movies: library.length,
        monitored: library.filter((item) => item.monitored).length,
        downloaded: library.filter((item) => item.hasFile).length,
        storage: library.reduce((sum, item) => sum + item.sizeOnDisk, 0),
      };
    });
  }

  async getCalendarEventsAsync(start: Date, end: Date, includeUnmonitored = true): Promise<CalendarEvent[]> {
    return this.runAsync(async (http) => {
      const events = await this.readAsync(
        http,
        this.url("/api/v3/calendar", { start, end, unmonitored: includeUnmonitored }),
        radarrCalendarSchema,
      );
      return events.flatMap((event) => {
        const src = this.bestImage([...event.images])?.remoteUrl;
        return radarrReleaseTypes.flatMap((releaseType): CalendarEvent[] => {
          const date = event[releaseType];
          if (date === undefined) return [];
          return [
            {
              title: event.title,
              subTitle: event.originalTitle,
              description: event.overview ?? null,
              startDate: date,
              endDate: null,
              image: src ? { src, aspectRatio: { width: 7, height: 12 } } : null,
              location: null,
              metadata: { type: "radarr", releaseType },
              indicatorColor: "yellow",
              links: this.imdbLinks(
                [
                  {
                    href: this.externalUrl(`/movie/${event.titleSlug}`).toString(),
                    name: "Radarr",
                    logo: "/images/apps/radarr.svg",
                    color: undefined,
                    isDark: true,
                  },
                ],
                event.imdbId,
              ),
            },
          ];
        });
      });
    });
  }

  async getMissingAsync(pageSize = 10): Promise<{ items: MissingMediaItem[]; totalCount: number }> {
    return this.runAsync(async (http) => {
      const data = await this.readAsync(
        http,
        this.url("/api/v3/wanted/missing", { page: 1, pageSize, sortKey: "title", sortDirection: "ascending" }),
        radarrMissingSchema,
      );
      return {
        totalCount: data.totalRecords,
        items: data.records.map((movie): MissingMediaItem => ({
          id: movie.id,
          title: movie.title,
          type: "movie",
          year: movie.year,
          imageUrl: movie.images.find((image) => image.coverType === "poster")?.remoteUrl ?? null,
          link: this.externalUrl(`/movie/${movie.titleSlug}`).toString(),
        })),
      };
    });
  }

  async getMediaQueueAsync(pageSize = 10): Promise<{ items: QueuedMediaItem[]; totalCount: number }> {
    return this.runAsync(async (http) => {
      const data = await this.readAsync(
        http,
        this.url("/api/v3/queue", { page: 1, pageSize, includeMovie: true }),
        radarrQueueSchema,
      );
      return {
        totalCount: data.totalRecords,
        items: data.records.map((item): QueuedMediaItem => {
          const size = item.size ?? 0;
          return {
            id: item.id,
            title: item.movie?.title ?? item.title,
            type: "movie",
            status: item.status,
            timeLeft: item.timeleft ?? null,
            percentComplete: size > 0 ? Math.round(((size - (item.sizeleft ?? 0)) / size) * 100) : 0,
            year: item.movie?.year,
            imageUrl: item.movie?.images.find((image) => image.coverType === "poster")?.remoteUrl ?? null,
            link: item.movie?.titleSlug
              ? this.externalUrl(`/movie/${item.movie.titleSlug}`).toString()
              : this.externalUrl("/activity/queue").toString(),
          };
        }),
      };
    });
  }
}

const lidarrExternalLinks: Record<string, Omit<CalendarLink, "href">> = {
  vgmdb: { name: "VgmDB", color: "#f5c518", isDark: false, logo: "/images/apps/vgmdb.svg" },
  imdb: { name: "IMDb", color: "#f5c518", isDark: false, logo: "/images/apps/imdb.png" },
  last: { name: "LastFM", color: "#cf222a", isDark: false, logo: "/images/apps/lastfm.svg" },
};

export class LidarrMediaClient extends ApiKeyOrganizerClient implements MediaPublic<"lidarr"> {
  async getLibraryStatsAsync() {
    return this.runAsync(async (http) => {
      const library = await this.readAsync(http, this.url("/api/v1/artist"), monitoredLibrarySchema, "Lidarr");
      return { artists: library.length, monitored: library.filter((item) => item.monitored).length };
    });
  }

  async getCalendarEventsAsync(start: Date, end: Date, includeUnmonitored = true): Promise<CalendarEvent[]> {
    return this.runAsync(async (http) => {
      const events = await this.readAsync(
        http,
        this.url("/api/v1/calendar", { start, end, unmonitored: includeUnmonitored }),
        lidarrCalendarSchema,
      );
      return events.map((event): CalendarEvent => {
        const src = this.bestImage([...event.images])?.remoteUrl;
        const links: CalendarLink[] = [];
        if (event.artist.titleSlug)
          links.push({
            href: this.externalUrl(`/artist/${event.artist.titleSlug}`).toString(),
            name: "Lidarr",
            logo: "/images/apps/lidarr.svg",
            color: undefined,
            isDark: true,
          });
        for (const link of event.artist.links) {
          const externalLink = lidarrExternalLinks[link.name];
          if (externalLink) links.push({ ...externalLink, href: link.url });
        }
        return {
          title: event.title,
          subTitle: event.artist.artistName,
          description: event.overview ?? null,
          startDate: event.releaseDate,
          endDate: null,
          image: src ? { src, aspectRatio: { width: 7, height: 12 } } : null,
          location: null,
          indicatorColor: "cyan",
          links,
        };
      });
    });
  }
}

export class ReadarrMediaClient extends ApiKeyOrganizerClient implements MediaPublic<"readarr"> {
  async getLibraryStatsAsync() {
    return this.runAsync(async (http) => {
      const library = await this.readAsync(http, this.url("/api/v1/book"), monitoredLibrarySchema, "Readarr");
      return { books: library.length, monitored: library.filter((item) => item.monitored).length };
    });
  }

  async getCalendarEventsAsync(
    start: Date,
    end: Date,
    includeUnmonitored = true,
    includeAuthor = true,
  ): Promise<CalendarEvent[]> {
    return this.runAsync(async (http) => {
      const events = await this.readAsync(
        http,
        this.url("/api/v1/calendar", { start, end, unmonitored: includeUnmonitored, includeAuthor }),
        readarrCalendarSchema,
      );
      return events.map((event): CalendarEvent => {
        const image = this.bestImage([...event.images]);
        let src: string | undefined;
        if (image) {
          const path = image.url;
          if (!path.startsWith("/")) throw new Error("Readarr returned an invalid image path");
          src = this.externalUrl(`/${path.slice(1)}`).toString();
        }
        return {
          title: event.title,
          subTitle: event.author.authorName,
          description: event.overview ?? null,
          startDate: event.releaseDate,
          endDate: null,
          image: src ? { src, aspectRatio: { width: 7, height: 12 } } : null,
          location: null,
          indicatorColor: "#f5c518",
          links: [
            {
              href: this.externalUrl(`/author/${event.author.foreignAuthorId}`).toString(),
              color: "#f5c518",
              isDark: false,
              logo: "/images/apps/readarr.svg",
              name: "Readarr",
            },
          ],
        };
      });
    });
  }
}

export class BinderyMediaClient extends MediaHttpClient implements MediaPublic<"bindery"> {
  async getMissingAsync(pageSize = 10): Promise<{ items: MissingMediaItem[]; totalCount: number }> {
    return this.runAsync((http) =>
      http.responseAsync(
        this.url("/api/v1/wanted/missing"),
        { headers: { "X-Api-Key": this.secret("apiKey") } },
        async (response) => {
          const books = await binderyMissingSchema.parseAsync(await response.json());
          return {
            totalCount: books.length,
            items: books.slice(0, pageSize).map((book): MissingMediaItem => ({
              id: book.id,
              title: book.title,
              type: "book",
              year: book.releaseDate ? new Date(book.releaseDate).getUTCFullYear() : undefined,
              seriesTitle: book.author?.authorName,
              imageUrl: book.imageUrl?.startsWith("http") ? book.imageUrl : null,
              link: this.externalUrl(`/book/${book.id}`).toString(),
            })),
          };
        },
      ),
    );
  }

  async getMediaQueueAsync(pageSize = 10): Promise<{ items: QueuedMediaItem[]; totalCount: number }> {
    return this.runAsync((http) =>
      http.responseAsync(
        this.url("/api/v1/queue"),
        { headers: { "X-Api-Key": this.secret("apiKey") } },
        async (response) => {
          const data = await binderyQueueSchema.parseAsync(await response.json());
          const active = (Array.isArray(data) ? data : data.items).filter((item) => item.status !== "imported");
          return {
            totalCount: active.length,
            items: active.slice(0, pageSize).map((item): QueuedMediaItem => {
              const percentComplete = item.percentage ? Math.round(Number.parseFloat(item.percentage)) : 0;
              return {
                id: item.id,
                title: item.book?.title ?? item.title,
                type: "book",
                status: item.status,
                percentComplete,
                timeLeft: percentComplete >= 100 ? null : (item.timeLeft ?? null),
                seriesTitle: item.book?.authorName,
                imageUrl: null,
                link: item.book?.id
                  ? this.externalUrl(`/book/${item.book.id}`).toString()
                  : this.externalUrl("/queue").toString(),
              };
            }),
          };
        },
      ),
    );
  }

  protected testingAsync(http: MediaHttpOperation) {
    return http.responseAsync(
      this.url("/api/v1/system/status"),
      { headers: { "X-Api-Key": this.secret("apiKey") } },
      async (response) => {
        if (!response.ok) return TestConnectionError.StatusResult(response);
        await response.json();
        return { success: true } as const;
      },
    );
  }
}
