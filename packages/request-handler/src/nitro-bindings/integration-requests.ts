import dayjs from "dayjs";
import { z } from "zod/v4";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import type {
  AnchorNote,
  AnchorNotesListInput,
  AnchorNoteSummary,
  ArchiveTeamWarriorStatus,
  BazarrBadges,
  DownloadClientJobsAndStatus,
  EntityState,
  ImmichAlbum,
  ImmichServerStats,
  LlamacppStats,
  Notification,
  PaperlessNgxStats,
  PatchMonStats,
  StreamSession,
  TdarrQueue,
  TdarrStatistics,
  TdarrWorker,
  WudStats,
} from "@homarr/integrations";
import type {
  AudiobookshelfDashboardData,
  BeszelAlert,
  BeszelAlertHistory,
  BeszelContainerStatsRecord,
  BeszelSystem,
  BeszelSystemDetails,
  BeszelSystemRow,
  BeszelSystemStatsRecord,
  CalendarEvent,
  CoolifyInstanceInfo,
  DnsHoleSummary,
  FirewallCpuSummary,
  FirewallInterfacesSummary,
  FirewallMemorySummary,
  FirewallVersionSummary,
  Indexer,
  MediaRelease,
  MediaRequest,
  MediaRequestStats,
  MediaRequestStatus,
  MissingMediaItem,
  NavidromeDashboardData,
  NetworkControllerSummary,
  ProxmoxClusterInfo,
  QueuedMediaItem,
  RadarrReleaseType,
  SpeedtestTrackerDashboardData,
  SystemHealthMonitoring,
  TracearrDashboardData,
  TraefikDashboardData,
  UmamiEventSeries,
  UmamiMetricItem,
  UmamiVisitorStats,
  UpsSummary,
  UptimeKumaDashboardData,
  VpnSummary,
} from "@homarr/integrations/types";

import type { OwnedRequestFactories } from "./factories";
import type { WidgetBindingResources } from "./resources";
import { createWazuhRequests } from "./wazuh";

const mediaRequestStatusValues = [
  "pending",
  "approved",
  "declined",
  "failed",
  "completed",
] as const satisfies readonly MediaRequestStatus[];
export const mediaRequestListInputSchema = z.object({
  statuses: z.array(z.enum(mediaRequestStatusValues)).nonempty(),
  recentDays: z.number().min(0).max(365),
});
export type MediaRequestListInput = z.infer<typeof mediaRequestListInputSchema>;

const safeAttributeKeys = ["friendly_name", "unit_of_measurement", "device_class", "icon"] as const;
export const toSafeEntityDetails = (entity: EntityState) => {
  const attributes: Partial<Record<(typeof safeAttributeKeys)[number], string>> = {};
  for (const key of safeAttributeKeys) {
    const value = entity.attributes[key];
    if (typeof value === "string") attributes[key] = value;
  }
  return {
    attributes,
    entity_id: entity.entity_id,
    last_changed: entity.last_changed,
    last_updated: entity.last_updated,
    state: entity.state,
  };
};

export const getCalendarMonthRange = (year: number, month: number) => ({
  startDate: dayjs()
    .year(year)
    .month(month - 1)
    .startOf("month")
    .subtract(6, "days")
    .toDate(),
  endDate: dayjs()
    .year(year)
    .month(month - 1)
    .endOf("month")
    .add(6, "days")
    .toDate(),
});

const mapToSystemRow = (system: BeszelSystem, details: BeszelSystemDetails | null): BeszelSystemRow => {
  const info = system.info;
  return {
    id: system.id,
    name: system.name,
    status: system.status,
    cpu: info.cpu,
    memory: info.mp,
    disk: info.dp,
    extraFilesystems: info.efs ?? {},
    gpu: info.g ?? 0,
    loadAvg: info.la ?? null,
    netBytes: info.bb ?? (info.b ?? 0) * 1024 ** 2,
    temp: info.dt ?? null,
    battery: info.bat ?? null,
    services: info.sv?.[0] ?? 0,
    uptime: info.u,
    agentVersion: info.v,
    hostname: details?.hostname ?? info.h ?? system.name,
    cpuModel: details?.cpu ?? info.m ?? "Unknown",
    cores: details?.cores ?? info.ct ?? info.c ?? 1,
    memoryTotal: details?.memory ?? 0,
    osName: details?.os_name ?? "",
  };
};

const timePeriodConfig: Record<string, { type: string; perPage: number }> = {
  "1m": { type: "1m", perPage: 60 },
  "1h": { type: "1m", perPage: 60 },
  "12h": { type: "10m", perPage: 72 },
  "24h": { type: "20m", perPage: 72 },
  "1w": { type: "480m", perPage: 21 },
  "30d": { type: "480m", perPage: 90 },
};
const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

export const createIntegrationWidgetRequests = (
  factories: OwnedRequestFactories,
  resources: WidgetBindingResources,
) => {
  const { createIntegrationRequestHandler } = factories;
  const { createIntegrationAsync } = resources.providers;
  const logger = resources.log;
  const anchorNotesList = createIntegrationRequestHandler<AnchorNoteSummary[], "anchor", AnchorNotesListInput>({
    cacheNamespace: "anchor-notes:list",
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      return instance.listNotesAsync(input);
    },
  });
  const anchorNote = createIntegrationRequestHandler<AnchorNote, "anchor", { noteId: string }>({
    cacheNamespace: "anchor-notes:detail",
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      return instance.getNoteAsync(input.noteId);
    },
  });
  const archiveTeamWarrior = createIntegrationRequestHandler<
    ArchiveTeamWarriorStatus,
    IntegrationKindByCategory<"archiving">,
    Record<string, never>
  >({
    cacheNamespace: "archive-team-warrior:status",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getStatusAsync();
    },
  });
  const audiobookshelf = createIntegrationRequestHandler<
    AudiobookshelfDashboardData,
    "audiobookshelf",
    Record<string, never>
  >({
    cacheNamespace: "audiobookshelf:stats",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getDashboardDataAsync();
    },
  });
  const navidrome = createIntegrationRequestHandler<NavidromeDashboardData, "navidrome", Record<string, never>>({
    cacheNamespace: "navidrome:dashboard",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getDashboardDataAsync();
    },
  });
  const bazarr = createIntegrationRequestHandler<BazarrBadges, "bazarr", Record<string, never>>({
    cacheNamespace: "bazarr:badges",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getBadgesAsync();
    },
  });
  const beszelSystems = createIntegrationRequestHandler<BeszelSystemRow[], "beszel" | "mock", Record<string, never>>({
    cacheNamespace: "beszel:systems",
    async requestAsync(integration) {
      const start = performance.now();
      const instance = await createIntegrationAsync(integration);
      const systems = await instance.getSystemsAsync();
      const enriched = await Promise.all(
        systems.map(async (system) => {
          const details = await instance.getSystemDetailsAsync(system.id).catch((error: unknown) => {
            logger.warn("Failed to fetch Beszel system details", { systemId: system.id, error: String(error) });
            return null;
          });
          return mapToSystemRow(system, details);
        }),
      );
      logger.debug("beszelSystems fetch completed", {
        integrationId: integration.id,
        durationMs: Math.round(performance.now() - start),
        count: enriched.length,
      });
      return enriched;
    },
  });
  const beszelAlerts = createIntegrationRequestHandler<
    { alerts: BeszelAlert[]; history: BeszelAlertHistory[] },
    "beszel" | "mock",
    { includeHistory: boolean; maxHistoryItems: number }
  >({
    cacheNamespace: "beszel:alerts",
    async requestAsync(integration, input) {
      const start = performance.now();
      const instance = await createIntegrationAsync(integration);
      const alerts = await instance.getAlertsAsync();
      const history = input.includeHistory ? await instance.getAlertHistoryAsync(undefined, input.maxHistoryItems) : [];
      logger.debug("beszelAlerts fetch completed", {
        integrationId: integration.id,
        durationMs: Math.round(performance.now() - start),
        alertsCount: alerts.length,
        historyCount: history.length,
      });
      return { alerts, history };
    },
  });
  const beszelStats = createIntegrationRequestHandler<
    { systemStats: BeszelSystemStatsRecord[]; containerStats: BeszelContainerStatsRecord[] },
    "beszel" | "mock",
    { systemId: string; timePeriod: string; includeDocker: boolean }
  >({
    cacheNamespace: "beszel:stats",
    cacheTtlMs: 0,
    async requestAsync(integration, input) {
      const start = performance.now();
      const config = timePeriodConfig[input.timePeriod] ?? { type: "1m", perPage: 60 };
      const instance = await createIntegrationAsync(integration);
      const systemStatsPromise = instance.getSystemStatsAsync(input.systemId, config.type, config.perPage);
      let containerStatsPromise: Promise<BeszelContainerStatsRecord[]> = Promise.resolve([]);
      if (input.includeDocker) {
        containerStatsPromise = instance
          .getContainerStatsAsync(input.systemId, config.type, config.perPage)
          .catch((error: unknown) => {
            logger.warn("Failed to fetch Beszel container stats", { systemId: input.systemId, error: String(error) });
            return [];
          });
      }
      const [systemStats, containerStats] = await Promise.all([systemStatsPromise, containerStatsPromise]);
      logger.debug("beszelStats fetch completed", {
        integrationId: integration.id,
        systemId: input.systemId,
        timePeriod: input.timePeriod,
        durationMs: Math.round(performance.now() - start),
        systemStatsCount: systemStats.length,
        containerStatsCount: containerStats.length,
      });
      return { systemStats, containerStats };
    },
  });
  const calendar = createIntegrationRequestHandler<
    CalendarEvent[],
    IntegrationKindByCategory<"calendar">,
    { year: number; month: number; releaseType: RadarrReleaseType[]; showUnmonitored: boolean }
  >({
    cacheNamespace: "calendar:month",
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      const { startDate, endDate } = getCalendarMonthRange(input.year, input.month);
      return await instance.getCalendarEventsAsync(startDate, endDate, input.showUnmonitored);
    },
  });
  const coolify = createIntegrationRequestHandler<CoolifyInstanceInfo, "coolify", Record<string, never>>({
    cacheNamespace: "coolify:resources",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getInstanceInfoAsync();
    },
  });
  const dnsHole = createIntegrationRequestHandler<
    DnsHoleSummary,
    IntegrationKindByCategory<"dnsHole">,
    Record<string, never>
  >({
    cacheNamespace: "dns-hole:summary",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getSummaryAsync();
    },
  });
  const downloads = createIntegrationRequestHandler<
    DownloadClientJobsAndStatus,
    IntegrationKindByCategory<"downloadClient">,
    { limit: number; includeArchivedHistory: boolean; historyWindowDays: number }
  >({
    cacheNamespace: "downloads:jobs-and-status",
    cacheTtlMs: 10 * 1000,
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getClientJobsAndStatusAsync(input);
    },
  });
  const firewallCpu = createIntegrationRequestHandler<
    FirewallCpuSummary,
    IntegrationKindByCategory<"firewall">,
    Record<string, never>
  >({
    cacheNamespace: "firewall:cpu",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return instance.getFirewallCpuAsync();
    },
  });
  const firewallMemory = createIntegrationRequestHandler<
    FirewallMemorySummary,
    IntegrationKindByCategory<"firewall">,
    Record<string, never>
  >({
    cacheNamespace: "firewall:memory",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getFirewallMemoryAsync();
    },
  });
  const firewallInterfaces = createIntegrationRequestHandler<
    FirewallInterfacesSummary[],
    IntegrationKindByCategory<"firewall">,
    Record<string, never>
  >({
    cacheNamespace: "firewall:interfaces",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getFirewallInterfacesAsync();
    },
  });
  const firewallVersion = createIntegrationRequestHandler<
    FirewallVersionSummary,
    IntegrationKindByCategory<"firewall">,
    Record<string, never>
  >({
    cacheNamespace: "firewall:version",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getFirewallVersionAsync();
    },
  });
  const systemInfo = createIntegrationRequestHandler<
    SystemHealthMonitoring,
    Exclude<IntegrationKindByCategory<"healthMonitoring">, "proxmox" | "coolify" | "beszel" | "patchmon" | "wud">,
    Record<string, never>
  >({
    cacheNamespace: "health-monitoring:system-info",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getSystemInfoAsync();
    },
  });
  const clusterInfo = createIntegrationRequestHandler<ProxmoxClusterInfo, "proxmox" | "mock", Record<string, never>>({
    cacheNamespace: "health-monitoring:cluster-info",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getClusterInfoAsync();
    },
  });
  const immichStats = createIntegrationRequestHandler<
    ImmichServerStats,
    IntegrationKindByCategory<"photoService">,
    Record<string, never>
  >({
    cacheNamespace: "immich:server-stats",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getServerStatsAsync();
    },
  });
  const immichAlbums = createIntegrationRequestHandler<
    { id: string; albumName: string; assetCount: number }[],
    IntegrationKindByCategory<"photoService">,
    { limit?: number }
  >({
    cacheNamespace: "immich:albums",
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      const albums = await instance.getAlbumsAsync();
      if (input.limit === undefined) return albums;
      return albums
        .toSorted(
          (left, right) =>
            right.assetCount - left.assetCount ||
            compareText(left.albumName, right.albumName) ||
            compareText(left.id, right.id),
        )
        .slice(0, input.limit);
    },
  });
  const immichAlbum = createIntegrationRequestHandler<
    ImmichAlbum,
    IntegrationKindByCategory<"photoService">,
    { albumId?: string }
  >({
    cacheNamespace: "immich:album",
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getAlbumAsync(input.albumId);
    },
  });
  const immichAlbumPreview = createIntegrationRequestHandler<
    ImmichAlbum,
    IntegrationKindByCategory<"photoService">,
    { albumId: string; randomizePhotos: boolean }
  >({
    cacheNamespace: "immich:album-preview",
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getAlbumPreviewAsync(input.albumId, input.randomizePhotos);
    },
  });
  const indexerManager = createIntegrationRequestHandler<
    Indexer[],
    IntegrationKindByCategory<"indexerManager">,
    Record<string, never>
  >({
    cacheNamespace: "indexer-manager:indexers",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getIndexersAsync();
    },
  });
  const llamacpp = createIntegrationRequestHandler<LlamacppStats, "llamacpp", Record<string, never>>({
    cacheNamespace: "llamacpp:stats",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getStatsAsync();
    },
  });
  const mediaOrganizer = createIntegrationRequestHandler<
    { missing: MissingMediaItem[]; missingCount: number; queued: QueuedMediaItem[]; queuedCount: number },
    IntegrationKindByCategory<"mediaOrganizer">,
    { pageSize: number }
  >({
    cacheNamespace: "media-organizer:summary",
    cacheTtlMs: 60_000,
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      const [missingResult, queueResult] = await Promise.all([
        instance.getMissingAsync(input.pageSize),
        instance.getMediaQueueAsync(input.pageSize),
      ]);
      return {
        missing: missingResult.items,
        missingCount: missingResult.totalCount,
        queued: queueResult.items,
        queuedCount: queueResult.totalCount,
      };
    },
  });
  const mediaRelease = createIntegrationRequestHandler<
    MediaRelease[],
    IntegrationKindByCategory<"mediaRelease">,
    Record<string, never>
  >({
    cacheNamespace: "media-release:list",
    cacheTtlMs: 5 * 60 * 1000,
    fallbackToStaleOnError: true,
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getMediaReleasesAsync();
    },
  });
  const mediaRequestList = createIntegrationRequestHandler<
    MediaRequest[],
    IntegrationKindByCategory<"mediaRequest">,
    MediaRequestListInput
  >({
    cacheNamespace: "media-requests:list",
    cacheTtlMs: 60_000,
    fallbackToStaleOnError: true,
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      const requests = await instance.getRequestsAsync();
      const cutoff = input.recentDays > 0 ? Date.now() - input.recentDays * 24 * 60 * 60 * 1000 : null;
      const statusSet = new Set<MediaRequestStatus>(input.statuses);
      return requests.filter((request) => {
        if (!statusSet.has(request.status)) return false;
        if (cutoff !== null && request.createdAt.getTime() < cutoff) return false;
        return true;
      });
    },
  });
  const mediaRequestStats = createIntegrationRequestHandler<
    MediaRequestStats,
    IntegrationKindByCategory<"mediaRequest">,
    Record<string, never>
  >({
    cacheNamespace: "media-requests:stats",
    cacheTtlMs: 60_000,
    fallbackToStaleOnError: true,
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      const [stats, users] = await Promise.all([instance.getStatsAsync(), instance.getUsersAsync()]);
      return { stats, users };
    },
  });
  const mediaServer = createIntegrationRequestHandler<
    StreamSession[],
    IntegrationKindByCategory<"mediaService">,
    { showOnlyPlaying: boolean }
  >({
    cacheNamespace: "media-server:sessions",
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getCurrentSessionsAsync({ showOnlyPlaying: input.showOnlyPlaying });
    },
  });
  const mediaTranscoding = createIntegrationRequestHandler<
    { queue: TdarrQueue; workers: TdarrWorker[]; statistics: TdarrStatistics },
    IntegrationKindByCategory<"mediaTranscoding">,
    { pageOffset: number; pageSize: number }
  >({
    cacheNamespace: "media-transcoding:summary",
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      const [queue, workers, statistics] = await Promise.all([
        instance.getQueueAsync(input.pageOffset, input.pageSize),
        instance.getWorkersAsync(),
        instance.getStatisticsAsync(),
      ]);
      return { queue, workers, statistics };
    },
  });
  const networkController = createIntegrationRequestHandler<
    NetworkControllerSummary,
    IntegrationKindByCategory<"networkController">,
    Record<string, never>
  >({
    cacheNamespace: "network-controller:status",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getNetworkSummaryAsync();
    },
  });
  const notifications = createIntegrationRequestHandler<
    Notification[],
    IntegrationKindByCategory<"notifications">,
    Record<string, never>
  >({
    cacheNamespace: "notifications:list",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getNotificationsAsync();
    },
  });
  const paperlessNgx = createIntegrationRequestHandler<PaperlessNgxStats, "paperlessNgx", Record<string, never>>({
    cacheNamespace: "paperless-ngx:stats",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getStatsAsync();
    },
  });
  const patchmon = createIntegrationRequestHandler<PatchMonStats, "patchmon", Record<string, never>>({
    cacheNamespace: "patchmon:stats",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getStatsAsync();
    },
  });
  const smartHome = createIntegrationRequestHandler<
    EntityState,
    IntegrationKindByCategory<"smartHomeServer">,
    { entityId: string }
  >({
    cacheNamespace: "smart-home:entity-state",
    cacheTtlMs: 0,
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      const result = await instance.getEntityStateAsync(input.entityId);
      if (!result.success)
        throw new Error(`Unable to fetch data from Home Assistant error='${result.error as string}'`);
      return result.data;
    },
  });
  const speedtestTracker = createIntegrationRequestHandler<
    SpeedtestTrackerDashboardData,
    "speedtestTracker",
    Record<string, never>
  >({
    cacheNamespace: "speedtest-tracker:dashboard",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getDashboardDataAsync();
    },
  });
  const tracearr = createIntegrationRequestHandler<TracearrDashboardData, "tracearr", Record<string, never>>({
    cacheNamespace: "tracearr:dashboard",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getDashboardDataAsync();
    },
  });
  const traefik = createIntegrationRequestHandler<TraefikDashboardData, "traefik", Record<string, never>>({
    cacheNamespace: "traefik:summary",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getDashboardDataAsync();
    },
  });
  const umami = createIntegrationRequestHandler<
    UmamiVisitorStats,
    "umami",
    { websiteId: string; timeFrame: string; eventName?: string }
  >({
    cacheNamespace: "umami:stats",
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getVisitorStatsAsync(input.websiteId, input.timeFrame, input.eventName);
    },
  });
  const umamiEventNames = createIntegrationRequestHandler<string[], "umami", { websiteId: string }>({
    cacheNamespace: "umami:event-names",
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getEventNamesAsync(input.websiteId);
    },
  });
  const umamiTopPages = createIntegrationRequestHandler<
    UmamiMetricItem[],
    "umami",
    { websiteId: string; timeFrame: string; limit: number }
  >({
    cacheNamespace: "umami:top-pages",
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getTopPagesAsync(input.websiteId, input.timeFrame, input.limit);
    },
  });
  const umamiTopReferrers = createIntegrationRequestHandler<
    UmamiMetricItem[],
    "umami",
    { websiteId: string; timeFrame: string; limit: number }
  >({
    cacheNamespace: "umami:top-referrers",
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getTopReferrersAsync(input.websiteId, input.timeFrame, input.limit);
    },
  });
  const umamiMultiEvent = createIntegrationRequestHandler<
    UmamiEventSeries[],
    "umami",
    { websiteId: string; timeFrame: string; eventNames: string[] }
  >({
    cacheNamespace: "umami:multi-event",
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getMultiEventTimeSeriesAsync(input.websiteId, input.timeFrame, input.eventNames);
    },
  });
  const umamiActiveVisitors = createIntegrationRequestHandler<number, "umami", { websiteId: string }>({
    cacheNamespace: "umami:active-visitors",
    async requestAsync(integration, input) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getActiveVisitorsAsync(input.websiteId);
    },
  });
  const ups = createIntegrationRequestHandler<UpsSummary[], IntegrationKindByCategory<"ups">, Record<string, never>>({
    cacheNamespace: "ups:summaries",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getUpsSummariesAsync();
    },
  });
  const uptimeKuma = createIntegrationRequestHandler<UptimeKumaDashboardData, "uptimeKuma", Record<string, never>>({
    cacheNamespace: "uptime-kuma:monitors",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getDashboardDataAsync();
    },
  });
  const vpn = createIntegrationRequestHandler<VpnSummary, IntegrationKindByCategory<"vpn">, Record<string, never>>({
    cacheNamespace: "vpn:summary",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getSummaryAsync();
    },
  });
  const wud = createIntegrationRequestHandler<WudStats, "wud", Record<string, never>>({
    cacheNamespace: "wud:stats",
    async requestAsync(integration) {
      const instance = await createIntegrationAsync(integration);
      return await instance.getStatsAsync();
    },
  });
  return {
    anchorNote,
    anchorNotesList,
    archiveTeamWarrior,
    audiobookshelf,
    navidrome,
    bazarr,
    beszelAlerts,
    beszelStats,
    beszelSystems,
    calendar,
    coolify,
    dnsHole,
    downloads,
    firewallCpu,
    firewallInterfaces,
    firewallMemory,
    firewallVersion,
    systemInfo,
    clusterInfo,
    immichAlbum,
    immichAlbumPreview,
    immichAlbums,
    immichStats,
    indexerManager,
    llamacpp,
    mediaOrganizer,
    mediaRelease,
    mediaRequestList,
    mediaRequestStats,
    mediaServer,
    mediaTranscoding,
    networkController,
    notifications,
    paperlessNgx,
    patchmon,
    smartHome,
    speedtestTracker,
    tracearr,
    traefik,
    umamiActiveVisitors,
    umamiEventNames,
    umamiMultiEvent,
    umami,
    umamiTopPages,
    umamiTopReferrers,
    ups,
    uptimeKuma,
    vpn,
    wud,
    ...createWazuhRequests(factories, resources.providers),
  };
};
