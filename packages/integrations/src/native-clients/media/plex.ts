import { parseStringPromise } from "xml2js";
import { z } from "zod/v4";

import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { MediaRelease } from "../../interfaces/media-releases";
import type { CurrentSessionsInput, StreamSession } from "../../interfaces/media-server/media-server-types";
import type { PlexResponse } from "../../plex/interface";
import { MediaClientHoldError, MediaHttpClient } from "./http";
import type { MediaHttpOperation, MediaPublic } from "./http";

const optionalString = z.string().optional();
const streamSchema = z.object({
  $: z.object({
    streamType: z.string(),
    codec: optionalString,
    language: optionalString,
    selected: optionalString,
    width: optionalString,
    height: optionalString,
    frameRate: optionalString,
    channels: optionalString,
  }),
});
const mediaSchema = z.object({
  Part: z
    .array(z.object({ Stream: z.array(streamSchema).optional(), $: z.object({ container: optionalString }) }))
    .optional(),
  $: z.object({
    videoResolution: optionalString,
    videoCodec: optionalString,
    audioCodec: optionalString,
    bitrate: optionalString,
    container: optionalString,
  }),
});
const sessionSchema = z.object({
  User: z.array(z.object({ $: z.object({ id: z.string(), title: z.string(), thumb: optionalString }) })).optional(),
  Player: z
    .array(
      z.object({
        $: z.object({
          product: z.string(),
          title: z.string(),
          address: optionalString,
          state: optionalString,
          local: optionalString,
        }),
      }),
    )
    .optional(),
  Session: z
    .array(z.object({ $: z.object({ id: z.string(), bandwidth: optionalString, location: optionalString }) }))
    .optional(),
  TranscodeSession: z
    .array(
      z.object({
        $: z.object({
          throttled: optionalString,
          progress: optionalString,
          speed: optionalString,
          videoDecision: optionalString,
          audioDecision: optionalString,
          sourceVideoCodec: optionalString,
          sourceAudioCodec: optionalString,
          videoCodec: optionalString,
          audioCodec: optionalString,
          container: optionalString,
          width: optionalString,
          height: optionalString,
        }),
      }),
    )
    .optional(),
  Media: z.array(mediaSchema).optional(),
  $: z.object({
    grandparentTitle: optionalString,
    parentTitle: optionalString,
    parentIndex: optionalString,
    title: optionalString,
    index: optionalString,
    type: z.string(),
    live: optionalString,
    viewOffset: optionalString,
    duration: optionalString,
  }),
});
const sessionsSchema = z.object({
  MediaContainer: z.object({ Video: z.array(sessionSchema).optional(), Track: z.array(sessionSchema).optional() }),
}) satisfies z.ZodType<PlexResponse>;

function optionalNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function resolution(width: string | undefined, height: string | undefined) {
  const parsedWidth = optionalNumber(width);
  const parsedHeight = optionalNumber(height);
  return parsedWidth !== null && parsedHeight !== null ? { width: parsedWidth, height: parsedHeight } : null;
}

export class PlexMediaClient extends MediaHttpClient implements MediaPublic<"plex"> {
  async getCurrentSessionsAsync(_options: CurrentSessionsInput): Promise<StreamSession[]> {
    return this.runAsync((http) =>
      http.responseAsync(
        this.url("/status/sessions"),
        { headers: { "X-Plex-Token": this.secret("apiKey") } },
        async (response) => {
          const body = await response.text();
          let wire: unknown;
          try {
            wire = await parseStringPromise(body);
          } catch {
            throw new MediaClientHoldError("parse-error-normalization");
          }
          const data = sessionsSchema.parse(wire);
          const media = [...(data.MediaContainer.Video ?? []), ...(data.MediaContainer.Track ?? [])];
          if (media.length === 0) this.resources.log?.write("debug", "plex.sessions.empty", {});
          return media.flatMap((element): StreamSession[] => {
            const user = element.User?.[0];
            const player = element.Player?.[0];
            const session = element.Session?.[0];
            const transcode = element.TranscodeSession?.[0];
            const mediaInfo = element.Media?.[0];
            if (!player) return [];
            const streams = mediaInfo?.Part?.[0]?.Stream ?? [];
            const video = streams.find((stream) => stream.$.streamType === "1");
            const audio = streams.find((stream) => stream.$.streamType === "2");
            const state = player.$.state;
            const location = session?.$.location;
            const type = element.$.type;
            return [
              {
                sessionId: session?.$.id ?? "unknown",
                sessionName: `${player.$.product} (${player.$.title})`,
                user: {
                  userId: user?.$.id ?? "Anonymous",
                  username: user?.$.title ?? "Anonymous",
                  profilePictureUrl: user?.$.thumb ?? null,
                },
                currentlyPlaying: {
                  type:
                    element.$.live === "1" ? "tv" : type === "movie" ? "movie" : type === "track" ? "audio" : "video",
                  name: element.$.grandparentTitle ?? element.$.title ?? "Unknown",
                  seasonName: element.$.parentTitle,
                  seasonNumber: type === "episode" ? optionalNumber(element.$.parentIndex) : null,
                  episodeName: type === "episode" ? (element.$.title ?? null) : null,
                  episodeNumber: type === "episode" ? optionalNumber(element.$.index) : null,
                  albumName: type === "track" ? (element.$.parentTitle ?? null) : null,
                  episodeCount: optionalNumber(element.$.index),
                  playback: {
                    state: state === "playing" || state === "paused" || state === "buffering" ? state : null,
                    positionMs: optionalNumber(element.$.viewOffset),
                    durationMs: optionalNumber(element.$.duration),
                  },
                  location: location === "lan" || location === "wan" ? location : null,
                  metadata: {
                    video: {
                      resolution: resolution(video?.$.width, video?.$.height),
                      frameRate: optionalNumber(video?.$.frameRate),
                    },
                    audio: {
                      channelCount: optionalNumber(audio?.$.channels),
                      codec: audio?.$.codec ?? mediaInfo?.$.audioCodec ?? null,
                    },
                    transcoding: {
                      container: transcode?.$.container ?? null,
                      resolution: resolution(transcode?.$.width, transcode?.$.height),
                      target: {
                        audioCodec: transcode?.$.audioCodec ?? null,
                        videoCodec: transcode?.$.videoCodec ?? null,
                      },
                      isVideoDirect: transcode?.$.videoDecision !== "transcode",
                      isAudioDirect: transcode?.$.audioDecision !== "transcode",
                      containerChanged: Boolean(
                        transcode?.$.container &&
                        mediaInfo?.$.container &&
                        transcode.$.container !== mediaInfo.$.container,
                      ),
                    },
                    bitrateKbps: optionalNumber(session?.$.bandwidth) ?? optionalNumber(mediaInfo?.$.bitrate),
                  },
                },
              },
            ];
          });
        },
      ),
    );
  }

  async getMediaReleasesAsync(): Promise<MediaRelease[]> {
    throw new MediaClientHoldError("image-registration");
  }

  protected testingAsync(http: MediaHttpOperation) {
    return http.responseAsync(
      this.url("/prefs"),
      { headers: { "X-Plex-Token": this.secret("apiKey"), Accept: "application/json" } },
      async (response) => (response.ok ? ({ success: true } as const) : TestConnectionError.StatusResult(response)),
    );
  }
}
