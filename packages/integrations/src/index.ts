// Integration class values are intentionally NOT re-exported here.
// They are loaded lazily via createIntegrationAsync to avoid loading ~12K lines
// of integration code at startup for integrations that are never used.
// Type-only exports are kept for type-checking purposes.

// Type-only exports (these are erased at runtime and don't trigger module loading)
export type { AdGuardHomeIntegration } from "./adguard-home/adguard-home-integration";
export type { AnchorIntegration } from "./anchor/anchor-integration";
export type { Aria2Integration } from "./download-client/aria2/aria2-integration";
export type { DelugeIntegration } from "./download-client/deluge/deluge-integration";
export type { NzbGetIntegration } from "./download-client/nzbget/nzbget-integration";
export type { QBitTorrentIntegration } from "./download-client/qbittorrent/qbittorrent-integration";
export type { SabnzbdIntegration } from "./download-client/sabnzbd/sabnzbd-integration";
export type { SlskdIntegration } from "./download-client/slskd/slskd-integration";
export type { TransmissionIntegration } from "./download-client/transmission/transmission-integration";
export type { HomeAssistantIntegration } from "./homeassistant/homeassistant-integration";
export type { JellyfinIntegration } from "./jellyfin/jellyfin-integration";
export type { JellyseerrIntegration } from "./jellyseerr/jellyseerr-integration";
export type { LidarrIntegration } from "./media-organizer/lidarr/lidarr-integration";
export type { RadarrIntegration } from "./media-organizer/radarr/radarr-integration";
export type { ReadarrIntegration } from "./media-organizer/readarr/readarr-integration";
export type { SonarrIntegration } from "./media-organizer/sonarr/sonarr-integration";
export type { NextcloudIntegration } from "./nextcloud/nextcloud.integration";
export type { NTFYIntegration } from "./ntfy/ntfy-integration";
export type { OpenMediaVaultIntegration } from "./openmediavault/openmediavault-integration";
export type { GlancesIntegration } from "./glances/glances-integration";
export type { OverseerrIntegration } from "./overseerr/overseerr-integration";
export type { SeerrIntegration } from "./seerr/seerr-integration";
export type { PiHoleIntegrationV5 } from "./pi-hole/v5/pi-hole-integration-v5";
export type { PiHoleIntegrationV6 } from "./pi-hole/v6/pi-hole-integration-v6";
export type { PlexIntegration } from "./plex/plex-integration";
export type { ProwlarrIntegration } from "./prowlarr/prowlarr-integration";
export type { TrueNasIntegration } from "./truenas/truenas-integration";
export type { UnraidIntegration } from "./unraid/unraid-integration";
export type { OPNsenseIntegration } from "./opnsense/opnsense-integration";
export type { ICalIntegration } from "./ical/ical-integration";
export type { CoolifyIntegration } from "./coolify/coolify-integration";
export type { ImmichIntegration } from "./immich/immich-integration";
export type { TracearrIntegration } from "./tracearr/tracearr-integration";
export type { SpeedtestTrackerIntegration } from "./speedtest-tracker/speedtest-tracker-integration";

// Types
export type { IntegrationInput } from "./base/integration";
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
export { UpstreamMediaRequestStatus } from "./interfaces/media-requests/media-request-types";
export type { MediaRequestList, MediaRequestStats } from "./interfaces/media-requests/media-request-types";
export type { StreamSession } from "./interfaces/media-server/media-server-types";
export type {
  TdarrQueue,
  TdarrPieSegment,
  TdarrStatistics,
  TdarrWorker,
} from "./interfaces/media-transcoding/media-transcoding-types";
export type { ReleasesRepository, ReleaseResponse } from "./interfaces/releases-providers/releases-providers-types";
export type { Notification } from "./interfaces/notifications/notification-types";
export type { ImmichServerStats, ImmichAlbum, ImmichAsset } from "./immich/immich-integration";
export type {
  AnchorNote,
  AnchorNotePermission,
  AnchorNoteUpdateInput,
  AnchorNotesListInput,
  AnchorNoteSummary,
} from "./anchor/anchor-types";
export type { TracearrDashboardData } from "./tracearr/tracearr-types";
export type { SpeedtestTrackerDashboardData } from "./speedtest-tracker/speedtest-tracker-types";

// Schemas
export { anchorNotesListInputSchema } from "./anchor/anchor-types";
export { anchorNoteUpdateInputSchema } from "./anchor/anchor-types";
export { downloadClientItemSchema } from "./interfaces/downloads/download-client-items";

// Helpers
export { createIntegrationAsync } from "./base/creator";
