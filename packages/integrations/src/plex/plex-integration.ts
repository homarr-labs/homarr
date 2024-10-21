import { parseStringPromise } from "xml2js";

import { Integration } from "../base/integration";
import { IntegrationTestConnectionError } from "../base/test-connection-error";
import type { StreamSession } from "../interfaces/media-server/session";
import type { PlexResponse } from "./interface";

export class PlexIntegration extends Integration {
  public async getCurrentSessionsAsync(): Promise<StreamSession[]> {
    const token = super.getSecretValue("apiKey");

    const response = await fetch(`${this.integration.url}/status/sessions?X-Plex-Token=${token}`);
    const body = await response.text();

    // convert xml response to objects, as there is no JSON api
    const data = (await parseStringPromise(body)) as PlexResponse;
    const mediaContainer = data.MediaContainer;
    // no sessions are open or available
    if (!mediaContainer.Video) {
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
            type: PlexIntegration.getCurrentlyPlayingType(videoElement.$.type) ?? "video",
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
        return await fetch(`${this.integration.url}?X-Plex-Token=${token}`);
      },
      handleResponseAsync: async (response) => {
        const result = await response.text();
        const parsedResponse = (await parseStringPromise(result)) as unknown;
        if (typeof parsedResponse === "object" && parsedResponse !== null) {
          return;
        }
        throw new IntegrationTestConnectionError("invalidCredentials");
      },
    });
  }

  static getCurrentlyPlayingType(type: string): "movie" | "audio" | "video" | "tv" | undefined {
    switch (type) {
      case "movie":
        return "movie";
      case "episode":
        return "video";
      case "track":
        return "audio";
      default:
        return undefined;
    }
  }
}
