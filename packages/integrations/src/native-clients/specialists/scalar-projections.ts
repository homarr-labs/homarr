import type { StatsMetric, StatsUnit } from "../../stats/types";
import type { AnchorProtocol } from "./anchor";
import type { BazarrProtocol } from "./bazarr";
import type { CoolifyProtocol } from "./coolify";
import type { PatchmonProtocol, WudProtocol } from "./container-stats";
import type { LlamacppProtocol } from "./llamacpp";
import { mockSyntheticScalarStats } from "./mock";
import type { GotifyProtocol, NextcloudProtocol, NtfyProtocol } from "./notifications";
import type { PaperlessNgxProtocol } from "./paperless";
import type { SpeedtestTrackerProtocol } from "./speedtest";
import type { TraefikProtocol } from "./traefik";
import type { UmamiProtocol } from "./umami";
import type { UptimeKumaProtocol } from "./uptime-kuma";
import type { ArchiveTeamWarriorProtocol } from "./warrior";

const metric = (key: string, label: string, unit: StatsUnit = "count"): StatsMetric => ({ key, label, unit });

export const anchorScalarMetrics = [metric("notes", "Retrieved notes")];
export const nextcloudScalarMetrics = [metric("messages", "Retrieved notifications")];
export const ntfyScalarMetrics = [metric("messages", "Retrieved notifications")];
export const gotifyScalarMetrics = [metric("messages", "Retrieved notifications")];
export const coolifyScalarMetrics = [
  metric("applications", "Applications"),
  metric("services", "Services"),
  metric("servers", "Servers"),
];
export const paperlessNgxScalarMetrics = [
  metric("documentsTotal", "Documents"),
  metric("documentsInbox", "Inbox"),
  metric("tagsCount", "Tags"),
  metric("correspondentsCount", "Correspondents"),
  metric("documentTypesCount", "Document types"),
];
export const patchmonScalarMetrics = [
  metric("totalHosts", "Hosts"),
  metric("hostsNeedingUpdates", "Hosts needing updates"),
  metric("securityUpdates", "Security updates"),
  metric("totalOutdatedPackages", "Outdated packages"),
];
export const wudScalarMetrics = [
  metric("totalContainers", "Containers"),
  metric("updatesAvailable", "Updates available"),
];
export const llamacppScalarMetrics = [
  metric("health", "Health", "text"),
  metric("tokensGenerated", "Tokens generated"),
  metric("requestsProcessing", "Requests processing"),
];
export const speedtestTrackerScalarMetrics = [
  metric("ping", "Latency", "milliseconds"),
  metric("download", "Download", "bytesPerSecond"),
  metric("upload", "Upload", "bytesPerSecond"),
];
export const umamiScalarMetrics = [metric("websites", "Websites")];
export const archiveTeamWarriorScalarMetrics = [
  metric("running", "Running"),
  metric("completed", "Completed"),
  metric("failed", "Failed"),
];
export const uptimeKumaScalarMetrics = [
  metric("totalMonitors", "Monitors"),
  metric("upCount", "Up"),
  metric("downCount", "Down"),
  metric("averageUptimePercent", "Average uptime", "percent"),
];
export const traefikScalarMetrics = [
  metric("routers", "Routers"),
  metric("services", "Services"),
  metric("middlewares", "Middleware"),
];
export const bazarrScalarMetrics = [
  metric("episodes", "Missing episode subtitles"),
  metric("movies", "Missing movie subtitles"),
  metric("providers", "Providers"),
];
export const mockSyntheticScalarMetrics = [
  metric("documents", "Documents"),
  metric("songs", "Songs"),
  metric("storage", "Storage", "bytes"),
];

export const getAnchorScalarStatsAsync = async (client: Pick<AnchorProtocol, "listNotesAsync">) => ({
  notes: (await client.listNotesAsync()).length,
});
export const getNextcloudScalarStatsAsync = async (client: Pick<NextcloudProtocol, "getNotificationsAsync">) => ({
  messages: (await client.getNotificationsAsync()).length,
});
export const getNtfyScalarStatsAsync = async (client: Pick<NtfyProtocol, "getNotificationsAsync">) => ({
  messages: (await client.getNotificationsAsync()).length,
});
export const getGotifyScalarStatsAsync = async (client: Pick<GotifyProtocol, "getNotificationsAsync">) => ({
  messages: (await client.getNotificationsAsync()).length,
});
export const getCoolifyScalarStatsAsync = async (client: Pick<CoolifyProtocol, "getInstanceInfoAsync">) => {
  const data = await client.getInstanceInfoAsync();
  return { applications: data.applications.length, services: data.services.length, servers: data.servers.length };
};
export const getPaperlessNgxScalarStatsAsync = async (client: Pick<PaperlessNgxProtocol, "getStatsAsync">) => ({
  ...(await client.getStatsAsync()),
});
export const getPatchmonScalarStatsAsync = async (client: Pick<PatchmonProtocol, "getStatsAsync">) => {
  const { totalHosts, hostsNeedingUpdates, securityUpdates, totalOutdatedPackages } = await client.getStatsAsync();
  return { totalHosts, hostsNeedingUpdates, securityUpdates, totalOutdatedPackages };
};
export const getWudScalarStatsAsync = async (client: Pick<WudProtocol, "getStatsAsync">) => {
  const { totalContainers, updatesAvailable } = await client.getStatsAsync();
  return { totalContainers, updatesAvailable };
};
export const getLlamacppScalarStatsAsync = async (client: Pick<LlamacppProtocol, "getStatsAsync">) => {
  const data = await client.getStatsAsync();
  return {
    health: data.health,
    tokensGenerated: data.metrics.tokensGenerated,
    requestsProcessing: data.metrics.requestsProcessing,
  };
};
export const getSpeedtestTrackerScalarStatsAsync = async (
  client: Pick<SpeedtestTrackerProtocol, "getLatestResultAsync">,
) => {
  const data = await client.getLatestResultAsync();
  return {
    ping: data?.ping ?? null,
    download: data?.download_bits == null ? null : data.download_bits / 8,
    upload: data?.upload_bits == null ? null : data.upload_bits / 8,
  };
};
export const getUmamiScalarStatsAsync = async (client: Pick<UmamiProtocol, "getWebsitesAsync">) => ({
  websites: (await client.getWebsitesAsync()).length,
});
export const getArchiveTeamWarriorScalarStatsAsync = async (
  client: Pick<ArchiveTeamWarriorProtocol, "getStatusAsync">,
) => {
  const { counts } = await client.getStatusAsync();
  return { running: counts.running, completed: counts.completed, failed: counts.failed };
};
export const getUptimeKumaScalarStatsAsync = async (client: Pick<UptimeKumaProtocol, "getDashboardDataAsync">) => {
  const { totalMonitors, upCount, downCount, averageUptimePercent } = await client.getDashboardDataAsync();
  return { totalMonitors, upCount, downCount, averageUptimePercent };
};
export const getTraefikScalarStatsAsync = async (client: Pick<TraefikProtocol, "getDashboardDataAsync">) => {
  const { http, tcp, udp } = await client.getDashboardDataAsync();
  return {
    routers: http.routers.total + tcp.routers.total + udp.routers.total,
    services: http.services.total + tcp.services.total + udp.services.total,
    middlewares: http.middlewares.total + tcp.middlewares.total,
  };
};
export const getBazarrScalarStatsAsync = async (client: Pick<BazarrProtocol, "getBadgesAsync">) => {
  const { episodes, movies, providers } = await client.getBadgesAsync();
  return { episodes, movies, providers };
};
export const getMockSyntheticScalarStatsAsync = async () => mockSyntheticScalarStats();
