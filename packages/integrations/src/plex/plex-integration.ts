import { parseStringPromise } from "xml2js";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { ParseError } from "@homarr/common/server";
import { logger } from "@homarr/log";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { CurrentSessionsInput, StreamSession } from "../interfaces/media-server/session";
import type { PlexResponse } from "./interface";

export class PlexIntegration extends Integration {
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
