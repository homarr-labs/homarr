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
import type { TracearrDashboardData, TracearrStream } from "../tracearr/tracearr-types";
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
import { mockMediaSessions } from "./data/media-server";
import { mockMediaReleases } from "./data/media-releases";

const demoNow = Date.now();
const demoTimestamp = new Date(demoNow).toISOString();
const demoHoursAgo = (hours: number) => new Date(demoNow - hours * 3_600_000).toISOString();
const demoSpeedtests = [2310, 2280, 2330, 2290, 2340, 2300, 2320, 2270].map((download, index) => ({
  id: 42 - index,
  ping: 8.4 + index * 0.2,
  download_bits: download * 1_000_000,
  upload_bits: (1880 - index * 10) * 1_000_000,
  healthy: true,
  created_at: new Date(demoHoursAgo(index * 3)),
}));

const anchorNote: AnchorNote = {
  id: "homarr-demo-note",
  title: "Backup schedule",
  content: JSON.stringify({
    ops: [
      { insert: "Nightly backups\n", attributes: { bold: true } },
      {
        insert:
          "Database at 02:00 · off-site copy at 03:00. Keep the latest verified snapshot before updating services.\n",
      },
    ],
  }),
  createdAt: demoTimestamp,
  updatedAt: demoTimestamp,
  isPinned: true,
  isArchived: false,
  tagIds: ["demo"],
  permission: "viewer",
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
      {
        id: "demo-1",
        name: "urls-current",
        status: "running",
        project: "urlteam2",
        startTime: Math.floor(demoNow / 1000) - 900,
      },
      { id: "demo-2", name: "urls-previous", status: "completed", project: "urlteam2" },
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
    projects: [
      {
        id: 1,
        uuid: "home-cloud-demo",
        name: "Home cloud",
        description: "Personal services",
        environments: [{ id: 1, uuid: "production-demo", name: "Production", project_id: 1 }],
      },
      {
        id: 2,
        uuid: "media-demo",
        name: "Media",
        environments: [{ id: 2, uuid: "media-production-demo", name: "Production", project_id: 2 }],
      },
      {
        id: 3,
        uuid: "lab-demo",
        name: "Lab",
        environments: [{ id: 3, uuid: "lab-production-demo", name: "Production", project_id: 3 }],
      },
    ],
    servers: [
      {
        id: 1,
        uuid: "homarr-demo-edge",
        name: "Paris edge",
        description: "Deployment node",
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
        projectUuid: "home-cloud-demo",
        environmentName: "Production",
        environmentUuid: "production-demo",
      },
      {
        id: 2,
        uuid: "media-demo-app",
        name: "Media stack",
        status: "running:healthy",
        fqdn: null,
        projectName: "Media",
        projectUuid: "media-demo",
        environmentName: "Production",
        environmentUuid: "media-production-demo",
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
        projectName: "Lab",
        projectUuid: "lab-demo",
        environmentName: "Production",
        environmentUuid: "lab-production-demo",
      },
    ],
  } satisfies CoolifyInstanceInfo,
  firewallCpu: { total: 23 } satisfies FirewallCpuSummary,
  // Cumulative byte counters: the ten-second delta matches the mock traffic rates.
  firewallInterfaces: [
    {
      data: [
        { name: "WAN", receive: 12_412_750_000, transmit: 1_451_710_000 },
        { name: "LAN", receive: 1_451_710_000, transmit: 12_412_750_000 },
      ],
      timestamp: new Date(demoTimestamp),
    },
    {
      data: [
        { name: "WAN", receive: 11_171_475_000, transmit: 1_306_539_000 },
        { name: "LAN", receive: 1_306_539_000, transmit: 11_171_475_000 },
      ],
      timestamp: new Date(demoNow - 10_000),
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
  immichAlbums: [{ id: "demo-paris", albumName: "Demo gallery", assetCount: 2 }],
  immichAlbum: {
    id: "demo-paris",
    albumName: "Demo gallery",
    assets: [
      {
        id: "demo-photo-1",
        thumbhash: null,
        fileModifiedAt: demoTimestamp,
        fileCreatedAt: demoTimestamp,
        updatedAt: demoTimestamp,
        type: "IMAGE",
        publicLink: "/images/mock/demo-river.svg",
      },
      {
        id: "demo-photo-2",
        thumbhash: null,
        fileModifiedAt: demoTimestamp,
        fileCreatedAt: demoTimestamp,
        updatedAt: demoTimestamp,
        type: "IMAGE",
        publicLink: "/images/mock/demo-alpine.svg",
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
    latestResult: demoSpeedtests[0] ?? null,
    stats: {
      ping: { avg: 9.1, min: 8.4, max: 9.8 },
      download: { avg: 2305, avg_bits: 2_305_000_000, min: 2270, max: 2340 },
      upload: { avg: 1845, avg_bits: 1_845_000_000, min: 1810, max: 1880 },
      total_results: demoSpeedtests.length,
    },
    recentResults: demoSpeedtests,
  } satisfies SpeedtestTrackerDashboardData,
  tracearr: createTracearrMockData(),
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
      { timestamp: demoHoursAgo(4), visitors: 280, events: 0 },
      { timestamp: demoHoursAgo(2), visitors: 410, events: 0 },
      { timestamp: demoTimestamp, visitors: 536, events: 0 },
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
        { x: demoHoursAgo(4), y: 92 },
        { x: demoHoursAgo(2), y: 134 },
        { x: demoTimestamp, y: 188 },
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
        currentVersion: "v2.12.0",
        newVersion: "v2.13.0",
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

function createTracearrMockData(): TracearrDashboardData {
  const streams = mockMediaSessions.flatMap((session): TracearrStream[] => {
    const playing = session.currentlyPlaying;
    if (!playing || playing.playback.state !== "playing") return [];
    const metadata = playing.metadata;
    let mediaType: TracearrStream["mediaType"] = "movie";
    if (playing.type === "audio") mediaType = "track";
    if (playing.type === "video" || playing.type === "tv") mediaType = "episode";
    let videoDecision: TracearrStream["videoDecision"] = null;
    if (metadata?.video.resolution) {
      videoDecision = "directplay";
      if (metadata.transcoding.isVideoDirect === false) videoDecision = "transcode";
    }
    let audioDecision: TracearrStream["audioDecision"] = "directplay";
    if (metadata?.transcoding.isAudioDirect === false) audioDecision = "transcode";
    const isTranscode = videoDecision === "transcode" || audioDecision === "transcode";
    let containerDecision: "directplay" | "transcode" = "directplay";
    if (isTranscode) containerDecision = "transcode";
    let showTitle: string | null = null;
    if (mediaType === "episode") showTitle = playing.name;
    let resolution: string | null = null;
    if (metadata?.video.resolution) resolution = `${metadata.video.resolution.height}p`;
    const release = mockMediaReleases.find((item) => item.title === playing.name);
    return [
      {
        id: session.sessionId,
        serverId: "demo",
        serverName: "Jellyfin",
        username: session.user.username,
        userThumb: session.user.profilePictureUrl,
        userAvatarUrl: session.user.profilePictureUrl,
        mediaTitle: playing.episodeName ?? playing.name,
        mediaType,
        showTitle,
        seasonNumber: playing.seasonNumber ?? null,
        episodeNumber: playing.episodeNumber ?? null,
        year: null,
        thumbPath: null,
        posterUrl: release?.imageUrls.poster ?? null,
        durationMs: playing.playback.durationMs,
        state: "playing",
        progressMs: playing.playback.positionMs ?? 0,
        startedAt: new Date(demoNow - (playing.playback.positionMs ?? 0)).toISOString(),
        isTranscode,
        videoDecision,
        audioDecision,
        bitrate: metadata?.bitrateKbps ?? null,
        sourceVideoCodec: metadata?.transcoding.target.videoCodec ?? null,
        sourceAudioCodec: metadata?.audio.codec ?? null,
        sourceAudioChannels: metadata?.audio.channelCount ?? null,
        sourceVideoWidth: metadata?.video.resolution?.width ?? null,
        sourceVideoHeight: metadata?.video.resolution?.height ?? null,
        sourceVideoDetails: null,
        sourceAudioDetails: null,
        streamVideoCodec: metadata?.transcoding.target.videoCodec ?? null,
        streamAudioCodec: metadata?.transcoding.target.audioCodec ?? null,
        streamVideoDetails: null,
        streamAudioDetails: null,
        transcodeInfo: {
          containerDecision,
          sourceContainer: metadata?.transcoding.container ?? undefined,
          streamContainer: metadata?.transcoding.container ?? undefined,
        },
        subtitleInfo: null,
        resolution,
        sourceVideoCodecDisplay: metadata?.transcoding.target.videoCodec ?? null,
        sourceAudioCodecDisplay: metadata?.audio.codec ?? null,
        audioChannelsDisplay: null,
        streamVideoCodecDisplay: metadata?.transcoding.target.videoCodec ?? null,
        streamAudioCodecDisplay: metadata?.transcoding.target.audioCodec ?? null,
        device: session.sessionName,
        player: "Jellyfin",
        product: "Jellyfin",
        platform: null,
      },
    ];
  });
  const transcodes = streams.filter((stream) => stream.isTranscode).length;
  const totalBitrate = `${streams.reduce((total, stream) => total + (stream.bitrate ?? 0), 0) / 1000} Mbps`;
  const history = streams.map((stream, index) => {
    const stoppedAt = demoHoursAgo(index + 1);
    const durationMs = stream.durationMs ?? 0;
    return {
      ...stream,
      id: `history-${stream.id}`,
      state: "stopped" as const,
      durationMs,
      progressMs: durationMs,
      totalDurationMs: durationMs,
      startedAt: new Date(Date.parse(stoppedAt) - durationMs).toISOString(),
      stoppedAt,
      watched: true,
      segmentCount: 1,
      isTranscode: stream.isTranscode ?? false,
      user: {
        id: stream.username,
        username: stream.username,
        thumbUrl: stream.userThumb,
        avatarUrl: stream.userAvatarUrl,
      },
    };
  });
  const summary = {
    total: streams.length,
    transcodes,
    directStreams: 0,
    directPlays: streams.length - transcodes,
    totalBitrate,
  };
  return {
    stats: {
      activeStreams: streams.length,
      totalUsers: new Set(mockMediaSessions.map((session) => session.user.userId)).size,
      totalSessions: streams.length + history.length,
      recentViolations: 0,
      timestamp: demoTimestamp,
    },
    streams: {
      data: streams,
      summary: { ...summary, byServer: [{ serverId: "demo", serverName: "Jellyfin", ...summary }] },
    },
    violations: { data: [], meta: { total: 0, page: 1, pageSize: 10 } },
    recentActivity: { data: history, meta: { total: history.length, page: 1, pageSize: 10 } },
  };
}
