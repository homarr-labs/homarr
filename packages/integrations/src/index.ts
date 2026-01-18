export { PiHoleIntegrationV5 } from "./pi-hole/v5/pi-hole-integration-v5";

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

// Schemas
export { downloadClientItemSchema } from "./interfaces/downloads/download-client-items";

// Helpers
export { createIntegrationAsync } from "./base/creator";
