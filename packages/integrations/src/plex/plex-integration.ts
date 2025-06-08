import { parseStringPromise } from "xml2js";
import { z } from "zod";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { ParseError } from "@homarr/common/server";
import { logger } from "@homarr/log";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { CurrentSessionsInput, StreamSession } from "../interfaces/media-server/session";
import type { IMediaReleasesIntegration, MediaRelease } from "../types";
import type { PlexResponse } from "./interface";

export class PlexIntegration extends Integration implements IMediaReleasesIntegration {
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

        if (!playerElement) {
          return undefined;
        }

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
            episodeName: mediaElement.$.title ?? null,
            albumName: mediaElement.$.type === "track" ? (mediaElement.$.parentTitle ?? null) : null,
            episodeCount: mediaElement.$.index ?? null,
          },
        };
      })
      .filter((session): session is StreamSession => session !== undefined);

    return medias;
  }

  public async getMediaReleasesAsync(): Promise<MediaRelease[]> {
    const token = super.getSecretValue("apiKey");
    const machineIdentifier = await this.getMachineIdentifierAsync();
    const response = await fetchWithTrustedCertificatesAsync(super.url("/library/recentlyAdded"), {
      headers: {
        "X-Plex-Token": token,
        Accept: "application/json",
      },
    });

    const data = await recentlyAddedSchema.parseAsync(await response.json());
    return (
      data.MediaContainer.Metadata?.map((item) => {
        const poster = item.Image.find((image) => image?.type === "coverPoster")?.url;
        const backdrop = item.Image.find((image) => image?.type === "background")?.url;

        return {
          id: item.Media.at(0)?.id.toString() ?? item.key,
          type: item.type === "movie" ? "movie" : item.type === "tv" ? "tv" : "unknown",
          title: item.title,
          subtitle: item.tagline,
          description: item.summary,
          releaseDate: item.originallyAvailableAt ? new Date(item.originallyAvailableAt) : new Date(item.addedAt),
          imageUrls: {
            poster: poster ? super.url(poster as `/${string}`).toString() : undefined,
            backdrop: backdrop ? super.url(backdrop as `/${string}`).toString() : undefined,
          },
          producer: item.studio,
          rating: item.rating?.toFixed(1),
          tags: item.Genre.map((genre) => genre.tag),
          href: super
            .url(`/web/index.html#!/server/${machineIdentifier}/details?key=${encodeURIComponent(item.key)}`)
            .toString(),
          length: item.duration ? Math.round(item.duration / 1000) : undefined,
        };
      }) ?? []
    );
  }

  private async getMachineIdentifierAsync(): Promise<string> {
    const token = super.getSecretValue("apiKey");
    const response = await fetchWithTrustedCertificatesAsync(super.url("/identity"), {
      headers: {
        "X-Plex-Token": token,
        Accept: "application/json",
      },
    });
    const data = await identitySchema.parseAsync(await response.json());
    return data.MediaContainer.machineIdentifier;
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const token = super.getSecretValue("apiKey");

    const response = await input.fetchAsync(this.url("/"), {
      headers: {
        "X-Plex-Token": token,
      },
    });

    if (!response.ok) return TestConnectionError.StatusResult(response);

    const result = await response.text();

    await PlexIntegration.parseXmlAsync<PlexResponse>(result);
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

// https://plexapi.dev/api-reference/library/get-recently-added
const recentlyAddedSchema = z.object({
  MediaContainer: z.object({
    Metadata: z
      .array(
        z.object({
          key: z.string(),
          studio: z.string().optional(),
          type: z.string(), // For example "movie"
          title: z.string(),
          summary: z.string().optional(),
          duration: z.number().optional(),
          addedAt: z.number(),
          rating: z.number().optional(),
          tagline: z.string().optional(),
          originallyAvailableAt: z.string().optional(),
          Media: z.array(
            z.object({
              id: z.number(),
            }),
          ),
          Image: z.array(
            z
              .object({
                type: z.string(), // for example "coverPoster" or "background"
                url: z.string(),
              })
              .optional(),
          ),
          Genre: z.array(
            z.object({
              tag: z.string(),
            }),
          ),
        }),
      )
      .optional(),
  }),
});

// https://plexapi.dev/api-reference/server/get-server-identity
const identitySchema = z.object({
  MediaContainer: z.object({
    machineIdentifier: z.string(),
  }),
});

/*
{
  "MediaContainer": {
    "size": 2,
    "allowSync": false,
    "identifier": "com.plexapp.plugins.library",
    "mediaTagPrefix": "/system/bundle/media/flags/",
    "mediaTagVersion": 1744189307,
    "mixedParents": true,
    "Metadata": [
      {
        "allowSync": true,
        "librarySectionID": 1,
        "librarySectionTitle": "Films",
        "librarySectionUUID": "0b711797-d871-47fe-bea2-0d79a3b2a2f8",
        "ratingKey": "2",
        "key": "/library/metadata/2",
        "guid": "plex://movie/64a73d4790aebd038a220a7d",
        "slug": "mphatso",
        "studio": "JJC Films",
        "type": "movie",
        "title": "Mphatso",
        "summary": "",
        "thumb": "/library/metadata/2/thumb/1749324289",
        "duration": 8669529,
        "addedAt": 1749324286,
        "updatedAt": 1749324289,
        "Media": [
          {
            "id": 2,
            "duration": 8669529,
            "bitrate": 2035,
            "width": 720,
            "height": 304,
            "aspectRatio": 2.35,
            "audioChannels": 6,
            "audioCodec": "ac3",
            "videoCodec": "mpeg4",
            "videoResolution": "sd",
            "container": "avi",
            "videoFrameRate": "24p",
            "videoProfile": "advanced simple",
            "Part": [
              {
                "id": 2,
                "key": "/library/parts/2/1464786896/file.avi",
                "duration": 8669529,
                "file": "/movies/mp-htsob-xvid.avi",
                "size": 2205199166,
                "container": "avi",
                "videoProfile": "advanced simple"
              }
            ]
          }
        ],
        "Image": [
          {
            "alt": "Mphatso",
            "type": "coverPoster",
            "url": "/library/metadata/2/thumb/1749324289"
          }
        ],
        "UltraBlurColors": {
          "topLeft": "3c2a0d",
          "topRight": "73431c",
          "bottomRight": "674821",
          "bottomLeft": "3d1b09"
        },
        "Genre": [
          {
            "tag": "Drama"
          }
        ],
        "Country": [
          {
            "tag": "Zambia"
          }
        ],
        "Director": [
          {
            "tag": "Michael Tembo"
          }
        ],
        "Writer": [
          {
            "tag": "Ruth Chivwaka"
          },
          {
            "tag": "Phillip Chungu"
          }
        ],
        "Role": [
          {
            "tag": "Richard Chibuye"
          },
          {
            "tag": "Emmanuel Chindawi"
          },
          {
            "tag": "Lazarus Daka"
          }
        ]
      },
      {
        "allowSync": true,
        "librarySectionID": 1,
        "librarySectionTitle": "Films",
        "librarySectionUUID": "0b711797-d871-47fe-bea2-0d79a3b2a2f8",
        "ratingKey": "1",
        "key": "/library/metadata/1",
        "guid": "plex://movie/5d776831103a2d001f566b86",
        "slug": "idiocracy",
        "studio": "20th Century Fox",
        "type": "movie",
        "title": "Idiocracy",
        "contentRating": "R",
        "summary": "Corporal Joe Bauers, a decidedly average American, is selected for a top-secret hibernation program but is forgotten and left to awaken to a future so incredibly moronic that he's easily the most intelligent person alive.",
        "rating": 7.1,
        "audienceRating": 6.1,
        "year": 2006,
        "tagline": "In the future, intelligence is extinct.",
        "thumb": "/library/metadata/1/thumb/1749324288",
        "art": "/library/metadata/1/art/1749324288",
        "duration": 4844064,
        "originallyAvailableAt": "2006-09-01",
        "addedAt": 1749324285,
        "updatedAt": 1749324288,
        "audienceRatingImage": "rottentomatoes://image.rating.upright",
        "hasPremiumExtras": "1",
        "hasPremiumPrimaryExtra": "1",
        "ratingImage": "rottentomatoes://image.rating.ripe",
        "Media": [
          {
            "id": 1,
            "duration": 4844064,
            "bitrate": 11737,
            "width": 1920,
            "height": 1080,
            "aspectRatio": 1.78,
            "audioChannels": 6,
            "audioCodec": "ac3",
            "videoCodec": "h264",
            "videoResolution": "1080",
            "container": "mkv",
            "videoFrameRate": "PAL",
            "videoProfile": "high",
            "Part": [
              {
                "id": 1,
                "key": "/library/parts/1/1281850929/file.mkv",
                "duration": 4844064,
                "file": "/movies/Idiocracy.mkv",
                "size": 7106662502,
                "container": "mkv",
                "videoProfile": "high"
              }
            ]
          }
        ],
        "Image": [
          {
            "alt": "Idiocracy",
            "type": "coverPoster",
            "url": "/library/metadata/1/thumb/1749324288"
          },
          {
            "alt": "Idiocracy",
            "type": "background",
            "url": "/library/metadata/1/art/1749324288"
          },
          {
            "alt": "Idiocracy",
            "type": "clearLogo",
            "url": "/library/metadata/1/clearLogo/1749324288"
          }
        ],
        "UltraBlurColors": {
          "topLeft": "501a03",
          "topRight": "8b4611",
          "bottomRight": "864e10",
          "bottomLeft": "683409"
        },
        "Genre": [
          {
            "tag": "Adventure"
          },
          {
            "tag": "Comedy"
          }
        ],
        "Country": [
          {
            "tag": "United States of America"
          }
        ],
        "Director": [
          {
            "tag": "Mike Judge"
          }
        ],
        "Writer": [
          {
            "tag": "Etan Cohen"
          },
          {
            "tag": "Mike Judge"
          }
        ],
        "Role": [
          {
            "tag": "Luke Wilson"
          },
          {
            "tag": "Maya Rudolph"
          },
          {
            "tag": "Dax Shepard"
          }
        ]
      }
    ]
  }
}
  */
