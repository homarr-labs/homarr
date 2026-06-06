import type { IntegrationKind } from "./integration";
import type { IntegrationSecretKind } from "./integration";
import type { WidgetKind } from "./widget";

export interface HomepageWidgetMapping {
  integrationKind: IntegrationKind;
  widgetKind: WidgetKind;
  secretFieldMap: Record<string, IntegrationSecretKind>;
}

export const homepageWidgetMap: Record<string, HomepageWidgetMapping | null> = {
  sonarr: { integrationKind: "sonarr", widgetKind: "downloads", secretFieldMap: { key: "apiKey" } },
  radarr: { integrationKind: "radarr", widgetKind: "downloads", secretFieldMap: { key: "apiKey" } },
  lidarr: { integrationKind: "lidarr", widgetKind: "downloads", secretFieldMap: { key: "apiKey" } },
  readarr: { integrationKind: "readarr", widgetKind: "downloads", secretFieldMap: { key: "apiKey" } },
  prowlarr: { integrationKind: "prowlarr", widgetKind: "indexerManager", secretFieldMap: { key: "apiKey" } },
  bazarr: null,
  jellyfin: { integrationKind: "jellyfin", widgetKind: "mediaServer", secretFieldMap: { key: "apiKey" } },
  emby: { integrationKind: "emby", widgetKind: "mediaServer", secretFieldMap: { key: "apiKey" } },
  plex: { integrationKind: "plex", widgetKind: "mediaServer", secretFieldMap: { key: "apiKey" } },
  jellyseerr: {
    integrationKind: "jellyseerr",
    widgetKind: "mediaRequests-requestList",
    secretFieldMap: { key: "apiKey" },
  },
  overseerr: {
    integrationKind: "overseerr",
    widgetKind: "mediaRequests-requestList",
    secretFieldMap: { key: "apiKey" },
  },
  tautulli: null,
  sabnzbd: { integrationKind: "sabNzbd", widgetKind: "downloads", secretFieldMap: { key: "apiKey" } },
  nzbget: { integrationKind: "nzbGet", widgetKind: "downloads", secretFieldMap: { key: "apiKey" } },
  deluge: { integrationKind: "deluge", widgetKind: "downloads", secretFieldMap: { password: "password" } },
  transmission: {
    integrationKind: "transmission",
    widgetKind: "downloads",
    secretFieldMap: { username: "username", password: "password" },
  },
  qbittorrent: {
    integrationKind: "qBittorrent",
    widgetKind: "downloads",
    secretFieldMap: { username: "username", password: "password" },
  },
  pihole: { integrationKind: "piHole", widgetKind: "dnsHoleSummary", secretFieldMap: { key: "apiKey" } },
  adguard: {
    integrationKind: "adGuardHome",
    widgetKind: "dnsHoleSummary",
    secretFieldMap: { username: "username", password: "password" },
  },
  homeassistant: {
    integrationKind: "homeAssistant",
    widgetKind: "smartHome-entityState",
    secretFieldMap: { key: "apiKey" },
  },
  proxmox: { integrationKind: "proxmox", widgetKind: "healthMonitoring", secretFieldMap: {} },
};
