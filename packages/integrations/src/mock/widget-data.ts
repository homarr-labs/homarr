import type { AnchorNote, AnchorNoteSummary } from "../anchor/anchor-types";
import type { ArchiveTeamWarriorStatus } from "../archive-team-warrior/archive-team-warrior-types";
import type { BazarrBadges } from "../bazarr/bazarr-types";
import type { CoolifyInstanceInfo } from "../coolify/coolify-types";
import type { ImmichAlbum, ImmichServerStats } from "../immich/immich-integration";
import type { NavidromeDashboardData } from "../navidrome/navidrome-types";
import type { PaperlessNgxStats } from "../paperless-ngx/paperless-ngx-types";
import type { PatchMonStats } from "../patchmon/patchmon-types";
import type { SpeedtestTrackerDashboardData } from "../speedtest-tracker/speedtest-tracker-types";
import type {
  ThingportActivity,
  ThingportActivityDay,
  ThingportFeaturedModel,
  ThingportLibraryStats,
  ThingportModel,
  ThingportModelList,
} from "../thingport/thingport-types";
import type { TracearrDashboardData } from "../tracearr/tracearr-types";
import type { TraefikDashboardData } from "../traefik/traefik-types";
import type { UmamiEventSeries, UmamiMetricItem, UmamiVisitorStats, UmamiWebsite } from "../umami/umami-types";
import { createUptimeKumaMockStatusPage } from "../uptime-kuma/uptime-kuma-mock";
import type { LlamacppStats } from "../llama-cpp/llamacpp-types";
import type { WudStats } from "../wud/wud-types";
import { createWazuhMockData } from "../wazuh/wazuh-mock";
import type {
  FirewallCpuSummary,
  FirewallInterfacesSummary,
  FirewallMemorySummary,
  FirewallVersionSummary,
} from "../interfaces/firewall-summary/firewall-summary-types";
import type { VpnSummary } from "../interfaces/vpn-summary/vpn-summary-types";

const demoTimestamp = "2026-08-24T12:00:00.000Z";

const anchorNote: AnchorNote = {
  id: "homarr-demo-note",
  title: "Homarr demo runbook",
  content: JSON.stringify({
    ops: [
      { insert: "Welcome to the complete Homarr widget gallery.\n", attributes: { bold: true } },
      { insert: "Every integration-backed card below is powered by safe mock data.\n" },
    ],
  }),
  createdAt: demoTimestamp,
  updatedAt: demoTimestamp,
  isPinned: true,
  isArchived: false,
  tagIds: ["demo"],
  permission: "editor",
  background: null,
  userId: "demo",
};

export const mockWidgetData = {
  timestamp: demoTimestamp,
  anchorNote,
  anchorNotes: [
    {
      id: anchorNote.id,
      title: anchorNote.title,
      updatedAt: anchorNote.updatedAt,
      isPinned: anchorNote.isPinned,
      tagIds: anchorNote.tagIds,
      permission: anchorNote.permission,
    },
  ] satisfies AnchorNoteSummary[],
  archiveTeamWarrior: {
    status: "running",
    runnerStatus: "running",
    project: { id: "urlteam2", title: "URLTeam 2" },
    selectedProject: "urlteam2",
    broadcastMessage: "Archiving the open web, one URL at a time.",
    bandwidth: {
      received: 8_942_000_000,
      sent: 1_284_000_000,
      receiving: 4_800_000,
      sending: 720_000,
      session_id: "homarr-demo-session",
    },
    items: [
      { id: "demo-1", name: "urls-20260824-01", status: "running", project: "urlteam2", startTime: 1_777_000_000 },
      { id: "demo-2", name: "urls-20260824-00", status: "completed", project: "urlteam2" },
    ],
    counts: { running: 1, completed: 284, failed: 2, canceled: 0 },
    updatedAt: demoTimestamp,
  } satisfies ArchiveTeamWarriorStatus,
  audioStats: { artistCount: 842, albumCount: 1_976, songCount: 24_681 } satisfies NavidromeDashboardData,
  bazarr: {
    episodes: 12,
    movies: 4,
    providers: 6,
    status: 0,
    sonarr_signalr: "connected",
    radarr_signalr: "connected",
    announcements: 1,
  } satisfies BazarrBadges,
  coolify: {
    version: "4.0.0-beta.420",
    servers: [
      {
        id: 1,
        uuid: "homarr-demo-edge",
        name: "Paris edge",
        ip: "10.0.0.20",
        is_reachable: true,
        is_usable: true,
        settings: { server_id: 1, is_build_server: true, is_reachable: true, is_usable: true },
      },
    ],
    applications: [
      {
        id: 1,
        uuid: "homarr-demo-app",
        name: "Homarr",
        status: "running:healthy",
        fqdn: "https://homarr.dev",
        projectName: "Home cloud",
        environmentName: "Production",
      },
      {
        id: 2,
        uuid: "media-demo-app",
        name: "Media stack",
        status: "running:healthy",
        fqdn: null,
        projectName: "Home cloud",
        environmentName: "Production",
      },
    ],
    services: [
      {
        id: 3,
        uuid: "postgres-demo-service",
        name: "Postgres",
        status: "running:healthy",
        fqdn: null,
        applications: [],
        projectName: "Home cloud",
        environmentName: "Production",
      },
    ],
  } satisfies CoolifyInstanceInfo,
  firewallCpu: { total: 23 } satisfies FirewallCpuSummary,
  firewallInterfaces: [
    {
      data: [
        { name: "WAN", receive: 18_400_000, transmit: 4_200_000 },
        { name: "LAN", receive: 46_700_000, transmit: 21_300_000 },
      ],
      timestamp: new Date(demoTimestamp),
    },
  ] satisfies FirewallInterfacesSummary[],
  firewallMemory: { used: 3_220_000_000, total: 8_590_000_000, percent: 37.5 } satisfies FirewallMemorySummary,
  firewallVersion: { version: "24.7.11" } satisfies FirewallVersionSummary,
  immichStats: {
    userCount: 4,
    photoCount: 48_392,
    videoCount: 2_418,
    totalLibraryUsageInBytes: 684_510_412_800,
  } satisfies ImmichServerStats,
  immichAlbums: [
    { id: "demo-paris", albumName: "Paris weekend", assetCount: 128 },
    { id: "demo-mountains", albumName: "Alpine trails", assetCount: 84 },
  ],
  immichAlbum: {
    id: "demo-paris",
    albumName: "Paris weekend",
    assets: [
      {
        id: "demo-photo-1",
        thumbhash: null,
        fileModifiedAt: demoTimestamp,
        fileCreatedAt: demoTimestamp,
        updatedAt: demoTimestamp,
        type: "IMAGE",
        publicLink: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "demo-photo-2",
        thumbhash: null,
        fileModifiedAt: demoTimestamp,
        fileCreatedAt: demoTimestamp,
        updatedAt: demoTimestamp,
        type: "IMAGE",
        publicLink: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  } satisfies ImmichAlbum,
  thingportLibraryStats: {
    modelCount: 1_284,
    collectionCount: 37,
    categoryCount: 52,
    authorCount: 412,
    links: {
      models: "https://thingport.net/models",
      collections: "https://thingport.net/models/collections",
      categories: "https://thingport.net/",
      authors: "https://thingport.net/",
    },
  } satisfies ThingportLibraryStats,
  thingportModels: createThingportMockModels(),
  thingportFeaturedModel: {
    id: "demo-model-1",
    name: "Articulated Dragon",
    href: "https://thingport.net/models/demo-model-1",
    thumbnailUrl: null,
    author: "McGybeer",
    category: "Toys & Games",
    viewCount: 214,
    printCount: 9,
    mesh: null,
  } satisfies ThingportFeaturedModel,
  paperlessNgx: {
    documentsTotal: 2_847,
    documentsInbox: 14,
    correspondentsCount: 96,
    tagsCount: 38,
    documentTypesCount: 12,
  } satisfies PaperlessNgxStats,
  patchmon: {
    totalHosts: 18,
    hostsNeedingUpdates: 5,
    securityUpdates: 7,
    upToDateHosts: 13,
    hostsWithSecurityUpdates: 3,
    recentUpdates24h: 11,
    totalOutdatedPackages: 26,
    totalRepos: 42,
    lastUpdated: demoTimestamp,
    osDistribution: [
      { name: "Ubuntu 24.04", count: 9, osType: "linux", osVersion: "24.04" },
      { name: "Debian 13", count: 6, osType: "linux", osVersion: "13" },
      { name: "Fedora 42", count: 3, osType: "linux", osVersion: "42" },
    ],
  } satisfies PatchMonStats,
  ...createWazuhMockData(demoTimestamp),
  speedtestTracker: {
    latestResult: {
      id: 42,
      ping: 8.4,
      download_bits: 936_000_000,
      upload_bits: 487_000_000,
      healthy: true,
      created_at: new Date(demoTimestamp),
    },
    stats: {
      ping: { avg: 9.1, min: 6.8, max: 14.2 },
      download: { avg: 901, avg_bits: 901_000_000, min: 822, max: 948 },
      upload: { avg: 472, avg_bits: 472_000_000, min: 431, max: 495 },
      total_results: 128,
    },
    recentResults: [
      {
        id: 42,
        ping: 8.4,
        download_bits: 936_000_000,
        upload_bits: 487_000_000,
        healthy: true,
        created_at: new Date(demoTimestamp),
      },
    ],
  } satisfies SpeedtestTrackerDashboardData,
  tracearr: {
    stats: { activeStreams: 2, totalUsers: 14, totalSessions: 1_248, recentViolations: 1, timestamp: demoTimestamp },
    streams: {
      data: [],
      summary: {
        total: 2,
        transcodes: 1,
        directStreams: 0,
        directPlays: 1,
        totalBitrate: "24.8 Mbps",
        byServer: [
          {
            serverId: "demo",
            serverName: "Homarr Media",
            total: 2,
            transcodes: 1,
            directStreams: 0,
            directPlays: 1,
            totalBitrate: "24.8 Mbps",
          },
        ],
      },
    },
    violations: { data: [], meta: { total: 1, page: 1, pageSize: 10 } },
    recentActivity: { data: [], meta: { total: 1_248, page: 1, pageSize: 10 } },
  } satisfies TracearrDashboardData,
  traefik: {
    version: "3.5.0",
    entryPoints: ["web", "websecure", "metrics"],
    failedEndpoints: [],
    resources: [
      { protocol: "http", type: "router", name: "homarr@docker", provider: "docker", status: "enabled" },
      { protocol: "http", type: "service", name: "homarr@docker", provider: "docker", status: "enabled" },
      { protocol: "http", type: "middleware", name: "secure-headers@file", provider: "file", status: "enabled" },
    ],
    http: {
      routers: { total: 12, enabled: 12, warnings: 0, errors: 0 },
      services: { total: 10, enabled: 10, warnings: 0, errors: 0 },
      middlewares: { total: 8, enabled: 8, warnings: 0, errors: 0 },
    },
    tcp: {
      routers: { total: 2, enabled: 2, warnings: 0, errors: 0 },
      services: { total: 2, enabled: 2, warnings: 0, errors: 0 },
      middlewares: { total: 0, enabled: 0, warnings: 0, errors: 0 },
    },
    udp: {
      routers: { total: 1, enabled: 1, warnings: 0, errors: 0 },
      services: { total: 1, enabled: 1, warnings: 0, errors: 0 },
    },
  } satisfies TraefikDashboardData,
  umamiWebsites: [{ id: "homarr-demo", name: "Homarr demo", domain: "demo.homarr.dev" }] satisfies UmamiWebsite[],
  umamiVisitorStats: {
    domain: "demo.homarr.dev",
    websiteId: "homarr-demo",
    websiteName: "Homarr demo",
    totalVisitors: 8_429,
    totalPageviews: 21_384,
    totalVisits: 11_207,
    bounceRate: 32.4,
    avgDuration: 284,
    timeFrame: "24h",
    dataPoints: [
      { timestamp: "2026-08-24T08:00:00.000Z", visitors: 280, events: 0 },
      { timestamp: "2026-08-24T10:00:00.000Z", visitors: 410, events: 0 },
      { timestamp: "2026-08-24T12:00:00.000Z", visitors: 536, events: 0 },
    ],
    eventCount: 0,
  } satisfies UmamiVisitorStats,
  umamiEventNames: ["dashboard_opened", "widget_added", "board_shared"],
  umamiTopPages: [
    { x: "/", y: 8_240 },
    { x: "/boards/home", y: 5_812 },
    { x: "/manage/integrations", y: 1_942 },
  ] satisfies UmamiMetricItem[],
  umamiTopReferrers: [
    { x: "github.com", y: 3_842 },
    { x: "google.com", y: 2_106 },
    { x: "docs.homarr.dev", y: 1_284 },
  ] satisfies UmamiMetricItem[],
  umamiEventSeries: [
    {
      eventName: "dashboard_opened",
      dataPoints: [
        { x: "2026-08-24T08:00:00.000Z", y: 92 },
        { x: "2026-08-24T10:00:00.000Z", y: 134 },
        { x: "2026-08-24T12:00:00.000Z", y: 188 },
      ],
    },
  ] satisfies UmamiEventSeries[],
  uptimeKuma: createUptimeKumaMockStatusPage(Date.parse(demoTimestamp)),
  vpn: {
    vpnStatus: "running",
    dnsStatus: "running",
    publicIp: "198.51.100.42",
    country: "France",
    city: "Paris",
    vpnProvider: { protocol: "wireguard", provider: "Mullvad" },
  } satisfies VpnSummary,
  wud: {
    totalContainers: 24,
    updatesAvailable: 3,
    updates: [
      {
        id: "homarr",
        name: "Homarr",
        currentVersion: "v1.35.0",
        newVersion: "v1.36.0",
        link: "https://github.com/homarr-labs/homarr",
      },
      { id: "postgres", name: "Postgres", currentVersion: "17.5", newVersion: "17.6", link: null },
      { id: "redis", name: "Redis", currentVersion: "8.0.2", newVersion: "8.0.3", link: null },
    ],
  } satisfies WudStats,
  llamacpp: {
    health: "ok",
    model: {
      id: "unsloth/Qwen3.8-27B-UD-Q4_K_XL.gguf",
      name: "Qwen3.8-27B-UD-Q4_K_XL",
      contextSize: 32768,
      parameterCount: 27_347_098_624,
      fileSizeBytes: 16_842_776_576,
      quantization: "Q4_K_XL",
    },
    contextUsage: { usedTokens: 8192, contextSize: 32768, percent: 25 },
    slots: { total: 2, processing: 1, decoding: 1, speculative: false },
    metrics: {
      generationSpeedTps: 42.5,
      promptSpeedTps: 1840.2,
      avgGenerationSpeedTps: 39.8,
      avgPromptSpeedTps: 2104.6,
      requestsProcessing: 1,
      requestsDeferred: 0,
      tokensProcessed: 12_483,
      tokensGenerated: 1_024,
      promptCacheHitRate: 62,
      requestDecodedTokens: 96,
      taskId: 1042,
      specDraftTokens: 48,
      specAcceptedTokens: 12,
      specDrafts: 8,
    },
  } satisfies LlamacppStats,
} as const;

function createThingportMockModels(): Record<ThingportModelList, ThingportModel[]> {
  const models = [
    { name: "Articulated Dragon", viewCount: 214, printCount: 9 },
    { name: "Cable Management Clips", viewCount: 87, printCount: 23 },
    { name: "Gridfinity Baseplate 4x4", viewCount: 156, printCount: 17 },
    { name: "Benchy Calibration Boat", viewCount: 64, printCount: 31 },
    { name: "Planetary Gear Fidget", viewCount: 121, printCount: 6 },
  ].map((model, index) => ({
    id: `demo-model-${index + 1}`,
    name: model.name,
    href: `https://thingport.net/models/demo-model-${index + 1}`,
    thumbnailUrl: null,
    viewCount: model.viewCount,
    printCount: model.printCount,
    createdAt: new Date(Date.parse(demoTimestamp) - index * 36 * 60 * 60 * 1000).toISOString(),
  }));

  return {
    recentlyAdded: models,
    topViewed: models.toSorted((left, right) => right.viewCount - left.viewCount),
    topPrinted: models.toSorted((left, right) => right.printCount - left.printCount),
  };
}

/** A year and a half of made-up activity, the same on every load, filtered to the range a widget asks for. */
export function createThingportMockActivity(from: string, to: string): ThingportActivity {
  const days: ThingportActivityDay[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let time = Date.parse(`${from}T00:00:00Z`); time <= end; time += 24 * 60 * 60 * 1000) {
    const date = new Date(time).toISOString().slice(0, 10);
    // Cheap deterministic noise from the date, so the demo heatmap has busy streaks and quiet gaps.
    const seed = [...date].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 9973, 7);
    const weekday = new Date(time).getUTCDay();
    if (seed % 10 < (weekday === 0 || weekday === 6 ? 5 : 3)) continue;
    const download = seed % 5;
    const imported = seed % 7 === 0 ? 3 + (seed % 4) : seed % 3;
    const slicer = seed % 4 === 0 ? 1 + (seed % 3) : 0;
    const upload = seed % 11 === 0 ? 1 : 0;
    const counts: ThingportActivityDay["counts"] = {};
    if (imported) counts.import = imported;
    if (upload) counts.upload = upload;
    if (download) counts.download = download;
    if (slicer) counts.slicer = slicer;
    if (Object.keys(counts).length > 0) days.push({ date, counts });
  }

  return {
    days,
    total: days.reduce(
      (sum, day) => sum + Object.values(day.counts).reduce((daySum, count) => daySum + (count ?? 0), 0),
      0,
    ),
    years: [2026, 2025, 2024],
    profileUrl: "https://thingport.net/profile",
  };
}
