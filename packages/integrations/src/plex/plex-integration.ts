import { parseStringPromise } from "xml2js";

import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { logger } from "@homarr/log";

import { Integration } from "../base/integration";
import { IntegrationTestConnectionError } from "../base/test-connection-error";
import type { CurrentSessionsInput, StreamSession } from "../interfaces/media-server/session";
import type { PlexResponse } from "./interface";

export class PlexIntegration extends Integration {
  public async getCurrentSessionsAsync(options: CurrentSessionsInput): Promise<StreamSession[]> {
    const token = super.getSecretValue("apiKey");

    const response = await fetchWithTrustedCertificatesAsync(this.url("/status/sessions"), {
      headers: {
        "X-Plex-Token": token,
      },
    });
    const body = await response.text();
    // convert xml response to objects, as there is no JSON api
    const data = await PlexIntegration.parseXml<PlexResponse>(body);
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

  public async testConnectionAsync(): Promise<void> {
    const token = super.getSecretValue("apiKey");

    await super.handleTestConnectionResponseAsync({
      queryFunctionAsync: async () => {
        return await fetchWithTrustedCertificatesAsync(this.url("/"), {
          headers: {
            "X-Plex-Token": token,
          },
        });
      },
      handleResponseAsync: async (response) => {
        try {
          const result = await response.text();
          await PlexIntegration.parseXml<PlexResponse>(result);
          return;
        } catch {
          throw new IntegrationTestConnectionError("invalidCredentials");
        }
      },
    });
  }

  static parseXml<T>(xml: string): Promise<T> {
    return parseStringPromise(xml) as Promise<T>;
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
