import { parseStringPromise } from "xml2js";
import { z } from "zod/v4";

import { ParseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ImageProxy } from "@homarr/image-proxy";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { IMediaServerIntegration } from "../interfaces/media-server/media-server-integration";
import type { CurrentSessionsInput, StreamSession } from "../interfaces/media-server/media-server-types";
import type { IMediaReleasesIntegration, MediaRelease } from "../types";
import type { PlexResponse } from "./interface";

const logger = createLogger({ module: "plexIntegration" });

function parseOptionalNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseLocation(value: string | undefined): "lan" | "wan" | null {
  return value === "lan" || value === "wan" ? value : null;
}

function parsePlaybackState(value: string | undefined): "playing" | "paused" | "buffering" | null {
  return value === "playing" || value === "paused" || value === "buffering" ? value : null;
}

function parseResolution(
  width: string | undefined,
  height: string | undefined,
): { width: number; height: number } | null {
  const parsedWidth = parseOptionalNumber(width);
  const parsedHeight = parseOptionalNumber(height);
  return parsedWidth !== null && parsedHeight !== null ? { width: parsedWidth, height: parsedHeight } : null;
}

// Seasons in /library/recentlyAdded use "/library/metadata/{ratingKey}/children" as key, episodes reference their
// season through parentKey "/library/metadata/{ratingKey}"
function seasonKeyOf(item: { type: string; key: string }): string | null {
  return item.type === "season" ? item.key.replace(/\/children$/, "") : null;
}

function isStreamDirect(decision: string | undefined): boolean {
  // Plex reports "transcode" when a stream is re-encoded. "copy" (remuxed
  // without re-encoding) and an absent decision both count as direct.
  return decision !== "transcode";
}

export class PlexIntegration extends Integration implements IMediaServerIntegration, IMediaReleasesIntegration {
  public async getCurrentSessionsAsync(_options: CurrentSessionsInput): Promise<StreamSession[]> {
    const token = super.getSecretValue("apiKey");

    const response = await fetchWithTrustedCertificatesAsync(this.url("/status/sessions"), {
      headers: {
        "X-Plex-Token": token,
      },
    });
    const body = await response.text();
    // convert xml response to objects, as there is no JSON api
    const data = await PlexIntegration.parseXmlAsync<PlexResponse>(body);
    const mediaContainer = data.MediaContainer;
    const mediaElements = [mediaContainer.Video ?? [], mediaContainer.Track ?? []].flat();

    // no sessions are open or available
    if (mediaElements.length === 0) {
      logger.info("No active video sessions found in MediaContainer");
      return [];
    }

    const medias = mediaElements
      .map((mediaElement): StreamSession | undefined => {
        const userElement = mediaElement.User ? mediaElement.User[0] : undefined;
        const playerElement = mediaElement.Player ? mediaElement.Player[0] : undefined;
        const sessionElement = mediaElement.Session ? mediaElement.Session[0] : undefined;
        const transcodeElement = mediaElement.TranscodeSession ? mediaElement.TranscodeSession[0] : undefined;
        const mediaInfoElement = mediaElement.Media ? mediaElement.Media[0] : undefined;

        if (!playerElement) {
          return undefined;
        }

        const positionMs = parseOptionalNumber(mediaElement.$.viewOffset);
        const durationMs = parseOptionalNumber(mediaElement.$.duration);

        const playbackState = parsePlaybackState(playerElement.$.state);

        const location = parseLocation(sessionElement?.$.location);

        const streams = mediaInfoElement?.Part?.[0]?.Stream ?? [];
        const videoStream = streams.find((stream) => stream.$.streamType === "1");
        const audioStream = streams.find((stream) => stream.$.streamType === "2");

        const isVideoDirect = isStreamDirect(transcodeElement?.$.videoDecision);
        const isAudioDirect = isStreamDirect(transcodeElement?.$.audioDecision);
        const containerChanged = Boolean(
          transcodeElement?.$.container &&
          mediaInfoElement?.$.container &&
          transcodeElement.$.container !== mediaInfoElement.$.container,
        );
        const bitrateKbps =
          parseOptionalNumber(sessionElement?.$.bandwidth) ?? parseOptionalNumber(mediaInfoElement?.$.bitrate);

        return {
          sessionId: sessionElement?.$.id ?? "unknown",
          sessionName: `${playerElement.$.product} (${playerElement.$.title})`,
          user: {
            userId: userElement?.$.id ?? "Anonymous",
            username: userElement?.$.title ?? "Anonymous",
            profilePictureUrl: userElement?.$.thumb ?? null,
          },
          currentlyPlaying: {
            type: mediaElement.$.live === "1" ? "tv" : PlexIntegration.getCurrentlyPlayingType(mediaElement.$.type),
            name: mediaElement.$.grandparentTitle ?? mediaElement.$.title ?? "Unknown",
            seasonName: mediaElement.$.parentTitle,
            seasonNumber: mediaElement.$.type === "episode" ? parseOptionalNumber(mediaElement.$.parentIndex) : null,
            episodeName: mediaElement.$.type === "episode" ? (mediaElement.$.title ?? null) : null,
            episodeNumber: mediaElement.$.type === "episode" ? parseOptionalNumber(mediaElement.$.index) : null,
            albumName: mediaElement.$.type === "track" ? (mediaElement.$.parentTitle ?? null) : null,
            episodeCount: parseOptionalNumber(mediaElement.$.index),
            playback: {
              state: playbackState,
              positionMs,
              durationMs,
            },
            location,
            metadata: {
              video: {
                resolution: parseResolution(videoStream?.$.width, videoStream?.$.height),
                frameRate: parseOptionalNumber(videoStream?.$.frameRate),
              },
              audio: {
                channelCount: parseOptionalNumber(audioStream?.$.channels),
                codec: audioStream?.$.codec ?? mediaInfoElement?.$.audioCodec ?? null,
              },
              transcoding: {
                container: transcodeElement?.$.container ?? null,
                resolution: parseResolution(transcodeElement?.$.width, transcodeElement?.$.height),
                target: {
                  audioCodec: transcodeElement?.$.audioCodec ?? null,
                  videoCodec: transcodeElement?.$.videoCodec ?? null,
                },
                isVideoDirect,
                isAudioDirect,
                containerChanged,
              },
              bitrateKbps,
            },
          },
        };
      })
      .filter((session): session is StreamSession => session !== undefined);

    return medias;
  }

  public async getMediaReleasesAsync(): Promise<MediaRelease[]> {
    const token = super.getSecretValue("apiKey");
    const machineIdentifier = await this.getMachineIdentifierAsync();
    const data = await recentlyAddedSchema.parseAsync(await this.fetchJsonAsync("/library/recentlyAdded"));
    const recentlyAddedItems = await this.withRecentlyAddedEpisodesAsync(data.MediaContainer.Metadata ?? []);
    const imageProxy = new ImageProxy();

    const images =
      recentlyAddedItems
        .filter((item) => item.Image)
        .flatMap((item) => [
          {
            mediaKey: item.key,
            type: "poster",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            url: item.Image!.find((image) => image?.type === "coverPoster")?.url,
          },
          {
            mediaKey: item.key,
            type: "backdrop",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            url: item.Image!.find((image) => image?.type === "background")?.url,
          },
        ])
        .filter(
          (image): image is { mediaKey: string; type: "poster" | "backdrop"; url: string } => image.url !== undefined,
        ) ?? [];

    const proxiedImages = await Promise.all(
      images.map(async (image) => {
        const imageUrl = super.url(image.url as `/${string}`);
        const proxiedImageUrl = await imageProxy
          .createImageAsync(imageUrl.toString(), {
            "X-Plex-Token": token,
          })
          .catch((error) => {
            logger.debug(new Error("Failed to proxy image", { cause: error }));
            return undefined;
          });
        return {
          mediaKey: image.mediaKey,
          type: image.type,
          url: proxiedImageUrl,
        };
      }),
    );

    const media = recentlyAddedItems
      .filter((item) => item.Image)
      .map((item) => {
        const title =
          item.type === "episode"
            ? (item.grandparentTitle ?? item.title)
            : item.type === "season"
              ? (item.parentTitle ?? item.title)
              : item.title;

        return {
          id: item.Media?.at(0)?.id.toString() ?? item.key,
          type: mapType(item.type),
          title,
          subtitle: title === item.title ? item.tagline : item.title,
          description: item.summary,
          releaseDate: item.originallyAvailableAt
            ? new Date(item.originallyAvailableAt)
            : new Date(item.addedAt * 1000),
          imageUrls: {
            poster: proxiedImages.find((image) => image.mediaKey === item.key && image.type === "poster")?.url,
            backdrop: proxiedImages.find((image) => image.mediaKey === item.key && image.type === "backdrop")?.url,
          },
          producer: item.studio,
          rating: item.rating?.toFixed(1),
          tags: item.Genre?.map((genre) => genre.tag) ?? [],
          href: super
            .url(
              // Url with children on the end results in infinite loading screen, see https://github.com/homarr-labs/homarr/issues/4078
              `/web/index.html#!/server/${machineIdentifier}/details?key=${encodeURIComponent(item.key.replace("/children", ""))}`,
            )
            .toString(),
          length: item.duration ? Math.round(item.duration / 1000) : undefined,
        };
      });

    return media;
  }

  /**
   * `/library/recentlyAdded` lists seasons with the `addedAt` of the season itself, so episodes added to an
   * existing season never surface. This merges the most recently added episodes of every show library into
   * the list: seasons that received new episodes are bumped to the episode's `addedAt` (and its air date),
   * seasons that are no longer part of `/library/recentlyAdded` are re-created from the episode metadata.
   * Any failure while fetching episodes falls back to the plain `/library/recentlyAdded` result.
   */
  private async withRecentlyAddedEpisodesAsync(items: RecentlyAddedItem[]): Promise<RecentlyAddedItem[]> {
    const episodes = await this.getRecentlyAddedEpisodesAsync().catch((error) => {
      logger.warn(new Error("Failed to fetch recently added episodes, falling back to seasons only", { cause: error }));
      return [];
    });

    if (episodes.length === 0) {
      return items;
    }

    // Keep only the most recently added episode per season, episodes are sorted by addedAt descending
    const newestEpisodeBySeasonKey = new Map<string, RecentlyAddedEpisode>();
    for (const episode of episodes) {
      if (!episode.parentKey || newestEpisodeBySeasonKey.has(episode.parentKey)) continue;
      newestEpisodeBySeasonKey.set(episode.parentKey, episode);
    }

    const bumpedItems = items.map((item) => {
      const seasonKey = seasonKeyOf(item);
      const episode = seasonKey ? newestEpisodeBySeasonKey.get(seasonKey) : undefined;
      if (!episode || episode.addedAt <= item.addedAt) return item;

      return {
        ...item,
        addedAt: episode.addedAt,
        originallyAvailableAt: episode.originallyAvailableAt ?? item.originallyAvailableAt,
      };
    });

    const knownSeasonKeys = new Set(items.map(seasonKeyOf).filter((key): key is string => key !== null));
    const missingSeasons = [...newestEpisodeBySeasonKey.entries()]
      .filter(([seasonKey]) => !knownSeasonKeys.has(seasonKey))
      .map(([seasonKey, episode]): RecentlyAddedItem => {
        const poster = episode.grandparentThumb ?? episode.parentThumb;
        const backdrop = episode.art ?? episode.grandparentArt;

        return {
          key: `${seasonKey}/children`,
          type: "season",
          title:
            episode.parentTitle ?? (episode.parentIndex !== undefined ? `Season ${episode.parentIndex}` : "Season"),
          parentTitle: episode.grandparentTitle,
          addedAt: episode.addedAt,
          originallyAvailableAt: episode.originallyAvailableAt,
          Image:
            poster || backdrop
              ? [
                  ...(poster ? [{ type: "coverPoster", url: poster }] : []),
                  ...(backdrop ? [{ type: "background", url: backdrop }] : []),
                ]
              : undefined,
        };
      });

    return [...bumpedItems, ...missingSeasons]
      .toSorted((itemA, itemB) => itemB.addedAt - itemA.addedAt)
      .slice(0, RECENTLY_ADDED_LIMIT);
  }

  private async getRecentlyAddedEpisodesAsync(): Promise<RecentlyAddedEpisode[]> {
    const sections = await librarySectionsSchema.parseAsync(
      await this.fetchJsonAsync("/library/sections", { timeout: EPISODES_REQUEST_TIMEOUT_MS }),
    );
    const showSections = sections.MediaContainer.Directory?.filter((section) => section.type === "show") ?? [];

    const episodesPerSection = await Promise.all(
      showSections.map(async (section) => {
        const data = await recentlyAddedEpisodesSchema.parseAsync(
          await this.fetchJsonAsync(
            `/library/sections/${encodeURIComponent(section.key)}/all?type=4&sort=addedAt:desc&X-Plex-Container-Start=0&X-Plex-Container-Size=${RECENTLY_ADDED_LIMIT}`,
            { timeout: EPISODES_REQUEST_TIMEOUT_MS },
          ),
        );
        return data.MediaContainer.Metadata ?? [];
      }),
    );

    return episodesPerSection.flat().toSorted((episodeA, episodeB) => episodeB.addedAt - episodeA.addedAt);
  }

  /**
   * Wraps fetchWithTrustedCertificatesAsync with the Plex token and JSON accept header used by all JSON endpoints.
   */
  private async fetchJsonAsync(path: `/${string}`, options?: { timeout?: number }): Promise<unknown> {
    const token = super.getSecretValue("apiKey");
    const response = await fetchWithTrustedCertificatesAsync(super.url(path), {
      ...options,
      headers: {
        "X-Plex-Token": token,
        Accept: "application/json",
      },
    });

    return await response.json();
  }

  private async getMachineIdentifierAsync(): Promise<string> {
    const data = await identitySchema.parseAsync(await this.fetchJsonAsync("/identity"));
    return data.MediaContainer.machineIdentifier;
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const token = super.getSecretValue("apiKey");

    const response = await input.fetchAsync(super.url("/prefs"), {
      headers: {
        "X-Plex-Token": token,
        Accept: "application/json",
      },
    });

    if (!response.ok) return TestConnectionError.StatusResult(response);

    return { success: true };
  }

  static async parseXmlAsync<T>(xml: string): Promise<T> {
    try {
      return (await parseStringPromise(xml)) as Promise<T>;
    } catch (error) {
      throw new ParseError(
        "Invalid xml format",
        error instanceof Error
          ? {
              cause: error,
            }
          : undefined,
      );
    }
  }

  static getCurrentlyPlayingType(type: string): NonNullable<StreamSession["currentlyPlaying"]>["type"] {
    switch (type) {
      case "movie":
        return "movie";
      case "episode":
        return "video";
      case "track":
        return "audio";
      default:
        return "video";
    }
  }
}

// Default page size of /library/recentlyAdded
const RECENTLY_ADDED_LIMIT = 50;
// Episodes are an addition to /library/recentlyAdded, a stalled library request must not block the fallback
const EPISODES_REQUEST_TIMEOUT_MS = 10_000;

const recentlyAddedItemSchema = z.object({
  key: z.string(),
  studio: z.string().optional(),
  type: z.string(), // For example "movie", "album"
  title: z.string(),
  parentTitle: z.string().optional(),
  grandparentTitle: z.string().optional(),
  summary: z.string().optional(),
  duration: z.number().optional(),
  addedAt: z.number(),
  rating: z.number().optional(),
  tagline: z.string().optional(),
  originallyAvailableAt: z.string().optional(),
  Media: z
    .array(
      z.object({
        id: z.number(),
      }),
    )
    .optional(),
  Image: z
    .array(
      z
        .object({
          type: z.string(), // for example "coverPoster" or "background"
          url: z.string(),
        })
        .optional(),
    )
    .optional(),
  Genre: z
    .array(
      z.object({
        tag: z.string(),
      }),
    )
    .optional(),
});

type RecentlyAddedItem = z.infer<typeof recentlyAddedItemSchema>;

// https://plexapi.dev/api-reference/library/get-recently-added
const recentlyAddedSchema = z.object({
  MediaContainer: z.object({
    Metadata: z.array(recentlyAddedItemSchema).optional(),
  }),
});

// https://plexapi.dev/api-reference/library/get-all-libraries
const librarySectionsSchema = z.object({
  MediaContainer: z.object({
    Directory: z
      .array(
        z.object({
          key: z.string(),
          type: z.string(), // For example "movie", "show", "artist"
        }),
      )
      .optional(),
  }),
});

// https://plexapi.dev/api-reference/library/get-library-items with type=4 (episodes)
const recentlyAddedEpisodeSchema = z.object({
  key: z.string(),
  parentKey: z.string().optional(), // season, for example "/library/metadata/123"
  parentIndex: z.number().optional(),
  parentTitle: z.string().optional(), // season title, for example "Season 2"
  parentThumb: z.string().optional(),
  grandparentTitle: z.string().optional(), // show title
  grandparentThumb: z.string().optional(),
  grandparentArt: z.string().optional(),
  art: z.string().optional(),
  addedAt: z.number(),
  originallyAvailableAt: z.string().optional(),
});

type RecentlyAddedEpisode = z.infer<typeof recentlyAddedEpisodeSchema>;

const recentlyAddedEpisodesSchema = z.object({
  MediaContainer: z.object({
    Metadata: z.array(recentlyAddedEpisodeSchema).optional(),
  }),
});

// https://plexapi.dev/api-reference/server/get-server-identity
const identitySchema = z.object({
  MediaContainer: z.object({
    machineIdentifier: z.string(),
  }),
});

const mapType = (type: string): "movie" | "tv" | "unknown" => {
  switch (type) {
    case "movie":
      return "movie";
    case "show":
    case "season":
    case "episode":
      return "tv";
    default:
      return "unknown";
  }
};
