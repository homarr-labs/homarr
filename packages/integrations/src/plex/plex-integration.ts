import { parseStringPromise } from "xml2js";

import { logger } from "@homarr/log";

import { Integration } from "../base/integration";
import { IntegrationTestConnectionError } from "../base/test-connection-error";
import type { StreamSession } from "../interfaces/media-server/session";
import type { PlexResponse } from "./interface";

export class PlexIntegration extends Integration {
  public async getCurrentSessionsAsync(): Promise<StreamSession[]> {
    const token = super.getSecretValue("apiKey");

    const response = await fetch(`${this.integration.url}/status/sessions`, {
      headers: {
        "X-Plex-Token": token,
      },
    });
    const body = await response.text();
    // convert xml response to objects, as there is no JSON api
    const data = await PlexIntegration.parseXml<PlexResponse>(body);
    const mediaContainer = data.MediaContainer;
    // no sessions are open or available
    if (!mediaContainer.Video) {
      logger.info("No active video sessions found in MediaContainer");
      return [];
    }
    const videoElements = mediaContainer.Video;

    const videos = videoElements
      .map((videoElement): StreamSession | undefined => {
        const userElement = videoElement.User ? videoElement.User[0] : undefined;
        const playerElement = videoElement.Player ? videoElement.Player[0] : undefined;
        const sessionElement = videoElement.Session ? videoElement.Session[0] : undefined;

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
            type: videoElement.$.live === "1" ? "tv" : PlexIntegration.getCurrentlyPlayingType(videoElement.$.type),
            name: videoElement.$.grandparentTitle ?? videoElement.$.title ?? "Unknown",
            seasonName: videoElement.$.parentTitle,
            episodeName: videoElement.$.title ?? null,
            albumName: videoElement.$.type === "track" ? (videoElement.$.parentTitle ?? null) : null,
            episodeCount: videoElement.$.index ?? null,
          },
        };
      })
      .filter((session): session is StreamSession => session !== undefined);

    return videos;
  }

  public async testConnectionAsync(): Promise<void> {
    const token = super.getSecretValue("apiKey");

    await super.handleTestConnectionResponseAsync({
      queryFunctionAsync: async () => {
        return await fetch(this.integration.url, {
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
