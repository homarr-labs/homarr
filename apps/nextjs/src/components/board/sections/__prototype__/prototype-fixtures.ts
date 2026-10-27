import type { RouterOutputs } from "@homarr/api";
import { getIconUrl } from "@homarr/definitions";
import type { StreamSession } from "@homarr/integrations";

type MediaQueryData = RouterOutputs["widget"]["mediaServer"]["getCurrentStreams"];
type StatsCatalog = RouterOutputs["widget"]["stats"]["catalog"];
type StatsSnapshot = RouterOutputs["widget"]["stats"]["snapshot"];

export interface PrototypeSessionCounts {
  playing: number;
  paused: number;
}

export const prototypeFixtureIds = {
  board: "adaptive-prototype-board",
  integration: "adaptive-prototype-jellyfin",
  failedIntegration: "adaptive-prototype-unavailable",
  container: "adaptive-prototype-container",
  media: "adaptive-prototype-media",
  stats: "adaptive-prototype-stats",
} as const;

/** Native Currently playing data; fixture transport only, never a service request. */
export function createPrototypeSessions(counts: PrototypeSessionCounts): StreamSession[] {
  const sessions: StreamSession[] = [];
  const movies = ["Arrival", "The Grand Budapest Hotel", "Moon", "Spirited Away"];
  const devices = ["Living room TV", "Bedroom TV", "Tablet", "Desktop"];
  const viewers = ["Alex", "Sam", "Robin", "Taylor"];
  const addSession = (state: "playing" | "paused", index: number) => {
    const offset = sessions.length;
    const title = movies[offset % movies.length] ?? "Arrival";
    sessions.push({
      sessionId: `adaptive-session-${state}-${index}`,
      sessionName: devices[offset % devices.length] ?? "Living room TV",
      user: {
        userId: `adaptive-viewer-${offset}`,
        username: viewers[offset % viewers.length] ?? "Alex",
        profilePictureUrl: null,
      },
      currentlyPlaying: {
        type: "movie",
        name: title,
        seasonName: undefined,
        playback: { state, positionMs: 2_340_000, durationMs: 6_960_000 },
        location: "lan",
        metadata: {
          video: { resolution: { width: 1920, height: 1080 }, frameRate: 24 },
          audio: { channelCount: 6, codec: "aac" },
          transcoding: {
            container: "mkv",
            resolution: null,
            target: { audioCodec: null, videoCodec: null },
            isVideoDirect: true,
            isAudioDirect: true,
            containerChanged: false,
          },
          bitrateKbps: 8_400,
        },
      },
    });
  };
  for (let index = 0; index < counts.playing; index += 1) addSession("playing", index);
  for (let index = 0; index < counts.paused; index += 1) addSession("paused", index);
  return sessions;
}

export function createPrototypeMediaData(
  counts: PrototypeSessionCounts,
  integrationId: string = prototypeFixtureIds.integration,
): MediaQueryData {
  return [
    {
      integrationId,
      integrationName: "Jellyfin · mock observations",
      integrationKind: "jellyfin",
      sessions: createPrototypeSessions(counts),
      error: undefined,
    },
  ];
}

/** A failed integration remains a native error result; it is not confirmed idle. */
export function createPrototypePartialMediaData(
  counts: PrototypeSessionCounts,
  integrationId: string = prototypeFixtureIds.integration,
  failedIntegrationId: string = prototypeFixtureIds.failedIntegration,
): MediaQueryData {
  return [
    ...createPrototypeMediaData(counts, integrationId),
    {
      integrationId: failedIntegrationId,
      integrationName: "Unavailable mock source",
      integrationKind: "jellyfin",
      sessions: [],
      error: "INTEGRATION_REQUEST_FAILED",
    },
  ];
}

export const prototypeStatsCatalog = {
  name: "Jellyfin",
  iconUrl: getIconUrl("jellyfin"),
  metrics: [{ key: "sessions", label: "Playback sessions", unit: "count" }],
} satisfies StatsCatalog;

export function createPrototypeStatsSnapshot(counts: PrototypeSessionCounts, observedAtMs: number): StatsSnapshot {
  return {
    values: { sessions: counts.playing + counts.paused },
    updatedAt: observedAtMs,
    retryAt: 0,
    error: false,
    stale: false,
  };
}

export function createPrototypeStatsOptions(integrationId: string = prototypeFixtureIds.integration) {
  return {
    entries: [
      {
        id: "adaptive-playback-sessions",
        integrationId,
        metric: "sessions",
        label: "Playback sessions",
        hidden: false,
        compact: false,
      },
    ],
    table: false,
    rows: true,
    plain: false,
    showIcon: true,
    spacing: "xs",
  };
}
