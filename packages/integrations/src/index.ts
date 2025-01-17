// General integrations
export { AdGuardHomeIntegration } from "./adguard-home/adguard-home-integration";
export { DelugeIntegration } from "./download-client/deluge/deluge-integration";
export { NzbGetIntegration } from "./download-client/nzbget/nzbget-integration";
export { QBitTorrentIntegration } from "./download-client/qbittorrent/qbittorrent-integration";
export { SabnzbdIntegration } from "./download-client/sabnzbd/sabnzbd-integration";
export { TransmissionIntegration } from "./download-client/transmission/transmission-integration";
export { HomeAssistantIntegration } from "./homeassistant/homeassistant-integration";
export { DownloadClientIntegration } from "./interfaces/downloads/download-client-integration";
export { JellyfinIntegration } from "./jellyfin/jellyfin-integration";
export { JellyseerrIntegration } from "./jellyseerr/jellyseerr-integration";
export { RadarrIntegration } from "./media-organizer/radarr/radarr-integration";
export { SonarrIntegration } from "./media-organizer/sonarr/sonarr-integration";
export { OpenMediaVaultIntegration } from "./openmediavault/openmediavault-integration";
export { OverseerrIntegration } from "./overseerr/overseerr-integration";
export { PiHoleIntegration } from "./pi-hole/pi-hole-integration";
export { PlexIntegration } from "./plex/plex-integration";
export { ProwlarrIntegration } from "./prowlarr/prowlarr-integration";
export { LidarrIntegration } from "./media-organizer/lidarr/lidarr-integration";
export { ReadarrIntegration } from "./media-organizer/readarr/readarr-integration";

// Types
export type { IntegrationInput } from "./base/integration";
export type { DownloadClientJobsAndStatus } from "./interfaces/downloads/download-client-data";
export type { ExtendedDownloadClientItem } from "./interfaces/downloads/download-client-items";
export type { ExtendedClientStatus } from "./interfaces/downloads/download-client-status";
export type { HealthMonitoring } from "./interfaces/health-monitoring/healt-monitoring";
export { MediaRequestStatus } from "./interfaces/media-requests/media-request";
export type { MediaRequestList, MediaRequestStats } from "./interfaces/media-requests/media-request";
export type { StreamSession } from "./interfaces/media-server/session";
export type { TdarrQueue } from "./interfaces/media-transcoding/queue";
export type { TdarrPieSegment, TdarrStatistics } from "./interfaces/media-transcoding/statistics";
export type { TdarrWorker } from "./interfaces/media-transcoding/workers";

// Schemas
export { downloadClientItemSchema } from "./interfaces/downloads/download-client-items";

// Helpers
export { integrationCreator, integrationCreatorFromSecrets } from "./base/creator";
export { IntegrationTestConnectionError } from "./base/test-connection-error";
