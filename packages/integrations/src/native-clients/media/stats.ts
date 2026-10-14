import type { StatsMetric, StatsUnit, StatsValue } from "../../stats/types";
import type { MediaPublic } from "./http";
import { settleMediaPairAsync } from "./http";

const metric = (key: string, label: string, unit: StatsUnit = "count"): StatsMetric => ({ key, label, unit });

export const jackettStatsMetrics = [metric("configured", "Configured indexers")];
export const navidromeStatsMetrics = [
  metric("artistCount", "Artists"),
  metric("albumCount", "Albums"),
  metric("songCount", "Songs"),
];
export const audiobookshelfStatsMetrics = [
  metric("libraryCount", "Libraries"),
  metric("totalAudiobooks", "Audiobooks"),
  metric("totalPodcasts", "Podcasts"),
  metric("totalListeningTimeSeconds", "Listening time", "seconds"),
  metric("activeSessions", "Active sessions"),
];
export const immichStatsMetrics = [
  metric("userCount", "Users"),
  metric("photoCount", "Photos"),
  metric("videoCount", "Videos"),
  metric("totalLibraryUsageInBytes", "Storage", "bytes"),
];
export const requestStatsMetrics = [
  metric("pending", "Pending requests"),
  metric("approved", "Approved requests"),
  metric("available", "Available requests"),
  metric("processing", "Processing requests"),
];
export const sonarrStatsMetrics = [
  metric("shows", "Shows"),
  metric("monitored", "Monitored"),
  metric("downloaded", "Downloaded episodes"),
  metric("storage", "Storage", "bytes"),
  metric("missing", "Missing"),
  metric("queued", "Queued"),
  metric("episodes", "Episodes"),
];
export const radarrStatsMetrics = [
  metric("movies", "Movies"),
  metric("monitored", "Monitored"),
  metric("downloaded", "Downloaded movies"),
  metric("storage", "Storage", "bytes"),
  metric("missing", "Missing"),
  metric("queued", "Queued"),
];
export const playbackStatsMetrics = [metric("sessions", "Playback sessions")];
export const prowlarrStatsMetrics = [metric("indexers", "Indexers")];
export const tdarrStatsMetrics = [
  metric("totalFileCount", "Files"),
  metric("totalTranscodeCount", "Transcodes"),
  metric("failedTranscodeCount", "Failed transcodes"),
];
export const tracearrStatsMetrics = [
  metric("activeStreams", "Active streams"),
  metric("totalUsers", "Users"),
  metric("totalSessions", "Sessions"),
  metric("recentViolations", "Recent violations"),
];
export const lidarrStatsMetrics = [
  metric("artists", "Artists"),
  metric("monitored", "Monitored"),
  metric("upcoming", "Events in the next 7 days"),
];
export const readarrStatsMetrics = [
  metric("books", "Books"),
  metric("monitored", "Monitored"),
  metric("upcoming", "Events in the next 7 days"),
];

export async function collectJackettStatsAsync(client: MediaPublic<"jackett">): Promise<Record<string, StatsValue>> {
  return await client.getStatsAsync();
}

export async function collectNavidromeStatsAsync(
  client: MediaPublic<"navidrome">,
): Promise<Record<string, StatsValue>> {
  return { ...(await client.getDashboardDataAsync()) };
}

export async function collectAudiobookshelfStatsAsync(
  client: MediaPublic<"audiobookshelf">,
): Promise<Record<string, StatsValue>> {
  const { libraries: _libraries, ...data } = await client.getDashboardDataAsync();
  return data;
}

export async function collectImmichStatsAsync(client: MediaPublic<"immich">): Promise<Record<string, StatsValue>> {
  return { ...(await client.getServerStatsAsync()) };
}

export async function collectRequestStatsAsync(
  client: MediaPublic<"overseerr"> | MediaPublic<"jellyseerr"> | MediaPublic<"seerr">,
): Promise<Record<string, StatsValue>> {
  const { pending, approved, available, processing } = await client.getStatsAsync();
  return { pending, approved, available, processing };
}

export async function collectSonarrStatsAsync(client: MediaPublic<"sonarr">): Promise<Record<string, StatsValue>> {
  const [library, counts] = await settleMediaPairAsync(
    client.getLibraryStatsAsync(),
    settleMediaPairAsync(client.getMissingAsync(1), client.getMediaQueueAsync(1)),
  );
  return { ...library, missing: counts[0].totalCount, queued: counts[1].totalCount };
}

export async function collectRadarrStatsAsync(client: MediaPublic<"radarr">): Promise<Record<string, StatsValue>> {
  const [library, counts] = await settleMediaPairAsync(
    client.getLibraryStatsAsync(),
    settleMediaPairAsync(client.getMissingAsync(1), client.getMediaQueueAsync(1)),
  );
  return { ...library, missing: counts[0].totalCount, queued: counts[1].totalCount };
}

export async function collectPlaybackStatsAsync(
  client: MediaPublic<"plex"> | MediaPublic<"jellyfin"> | MediaPublic<"emby">,
): Promise<Record<string, StatsValue>> {
  return { sessions: (await client.getCurrentSessionsAsync({ showOnlyPlaying: false })).length };
}

export async function collectProwlarrStatsAsync(client: MediaPublic<"prowlarr">): Promise<Record<string, StatsValue>> {
  return { indexers: (await client.getIndexersAsync()).length };
}

export async function collectTdarrStatsAsync(client: MediaPublic<"tdarr">): Promise<Record<string, StatsValue>> {
  const { totalFileCount, totalTranscodeCount, failedTranscodeCount } = await client.getStatisticsAsync();
  return { totalFileCount, totalTranscodeCount, failedTranscodeCount };
}

export async function collectTracearrStatsAsync(client: MediaPublic<"tracearr">): Promise<Record<string, StatsValue>> {
  const { activeStreams, totalUsers, totalSessions, recentViolations } = await client.getStatsAsync();
  return { activeStreams, totalUsers, totalSessions, recentViolations };
}

export async function collectLidarrStatsAsync(client: MediaPublic<"lidarr">): Promise<Record<string, StatsValue>> {
  const [library, events] = await settleMediaPairAsync(
    client.getLibraryStatsAsync(),
    client.getCalendarEventsAsync(new Date(), new Date(Date.now() + 7 * 86_400_000)),
  );
  return { ...library, upcoming: events.length };
}

export async function collectReadarrStatsAsync(client: MediaPublic<"readarr">): Promise<Record<string, StatsValue>> {
  const [library, events] = await settleMediaPairAsync(
    client.getLibraryStatsAsync(),
    client.getCalendarEventsAsync(new Date(), new Date(Date.now() + 7 * 86_400_000)),
  );
  return { ...library, upcoming: events.length };
}
