// Type-only compatibility surface. Runtime capabilities have explicit subpaths.
export type { IntegrationInput } from "./base/integration";
export type { PiHoleIntegrationV6 } from "./pi-hole/v6/pi-hole-integration-v6";
export type { DownloadClientJobsAndStatus } from "./interfaces/downloads/download-client-data";
export type { ExtendedDownloadClientItem } from "./interfaces/downloads/download-client-items";
export type { ExtendedClientStatus } from "./interfaces/downloads/download-client-status";
export type {
  FirewallInterface,
  FirewallCpuSummary,
  FirewallInterfacesSummary,
  FirewallVersionSummary,
  FirewallMemorySummary,
} from "./interfaces/firewall-summary/firewall-summary-types";
export type { SystemHealthMonitoring } from "./interfaces/health-monitoring/health-monitoring-types";
export type {
  MediaRequestList,
  MediaRequestStats,
  UpstreamMediaRequestStatus,
} from "./interfaces/media-requests/media-request-types";
export type { StreamSession } from "./interfaces/media-server/media-server-types";
export type { EntityState } from "./interfaces/smart-home/smart-home-types";
export type {
  TdarrQueue,
  TdarrPieSegment,
  TdarrStatistics,
  TdarrWorker,
} from "./interfaces/media-transcoding/media-transcoding-types";
export type { Notification } from "./interfaces/notifications/notification-types";
export type { ImmichServerStats, ImmichAlbum, ImmichAsset } from "./immich/immich-integration";
export type { PaperlessNgxStats } from "./paperless-ngx/paperless-ngx-types";
export type { PatchMonStats, PatchMonOsDistributionEntry } from "./patchmon/patchmon-types";
export type {
  AnchorNote,
  AnchorNotePermission,
  AnchorNoteUpdateInput,
  AnchorNotesListInput,
  AnchorNoteSummary,
} from "./anchor/anchor-types";
export type { TracearrDashboardData } from "./tracearr/tracearr-types";
export type { SpeedtestTrackerDashboardData } from "./speedtest-tracker/speedtest-tracker-types";
export type { AudiobookshelfDashboardData } from "./audiobookshelf/audiobookshelf-types";
export type { NavidromeDashboardData } from "./navidrome/navidrome-types";
export type { UptimeKumaDashboardData } from "./uptime-kuma/uptime-kuma-types";
export type { UmamiVisitorStats } from "./umami/umami-types";
export type { BazarrBadges } from "./bazarr/bazarr-types";
export type { TraefikDashboardData, TraefikProtocolSummary, TraefikResourceSummary } from "./traefik/traefik-types";
export type {
  ArchiveTeamWarriorBandwidth,
  ArchiveTeamWarriorItem,
  ArchiveTeamWarriorStatus,
} from "./archive-team-warrior/archive-team-warrior-types";
export type { WudStats, WudContainerUpdate } from "./wud/wud-types";

export type { ResponseContractFixture, ResponseContractParser } from "./base/response-contract";
