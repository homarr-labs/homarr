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
  container: "adaptive-prototype-container",
  media: "adaptive-prototype-media",
  stats: "adaptive-prototype-stats",
  downloads: "adaptive-prototype-downloads",
  requests: "adaptive-prototype-requests",
  downloadsIntegration: "adaptive-prototype-qbittorrent",
  requestsIntegration: "adaptive-prototype-jellyseerr",
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

export function createPrototypeDownloads(count: number): RouterOutputs["widget"]["downloads"]["getJobsAndStatuses"] {
  const names = [
    "Ubuntu 26.04 Desktop.iso",
    "Debian 13.6 Live.iso",
    "Fedora Workstation 45.iso",
    "Blender open movie collection",
    "Internet Archive public domain films",
    "LibreOffice offline documentation",
    "OpenStreetMap regional extract",
    "Krita resource bundle",
  ];
  return [
    {
      integrationId: prototypeFixtureIds.downloadsIntegration,
      integrationName: "qBittorrent · prototype data",
      integration: {
        id: prototypeFixtureIds.downloadsIntegration,
        name: "qBittorrent",
        kind: "qBittorrent",
        updatedAt: new Date(),
      },
      data: {
        status: { paused: false, rates: { down: count * 2_400_000, up: count * 150_000 }, types: ["torrent"] },
        items: Array.from({ length: count }, (_, index) => ({
          id: `smart-download-${index}`,
          index,
          name: names[index % names.length] ?? "Linux distribution.iso",
          type: "torrent" as const,
          size: 4_000_000_000,
          time: (index + 2) * 120_000,
          state: "leeching" as const,
          progress: (index + 1) / (count + 2),
          downSpeed: 2_400_000,
          upSpeed: 150_000,
          received: 500_000_000 + index * 300_000_000,
          sent: 25_000_000,
          added: Date.now() - 900_000,
          category: "Open content",
        })),
      },
    },
  ];
}

export function createPrototypeRequests(count: number): RouterOutputs["widget"]["mediaRequests"]["getLatestRequests"] {
  const names = ["Interstellar", "The Wild Robot", "Dune: Part Two", "Perfect Days", "Flow", "The Boy and the Heron"];
  return {
    failedIntegrations: [],
    requests: Array.from({ length: count }, (_, index) => ({
      id: index + 1,
      name: names[index % names.length] ?? "A new film",
      type: "movie" as const,
      status: "pending" as const,
      availability: "pending" as const,
      createdAt: new Date(),
      airDate: new Date("2024-01-01"),
      backdropImageUrl: "/images/demo-dashboard-background.svg",
      posterImagePath: "/images/apps/tmdb.svg",
      href: "https://www.themoviedb.org/",
      integrationId: prototypeFixtureIds.requestsIntegration,
      integration: { id: prototypeFixtureIds.requestsIntegration, name: "Jellyseerr", kind: "jellyseerr" as const },
      requestedBy: {
        id: index + 1,
        displayName: ["Alex", "Sam", "Robin"][index % 3] ?? "Alex",
        avatar: "/images/mock/avatar.jpg",
        link: "https://www.themoviedb.org/",
      },
    })),
  };
}
