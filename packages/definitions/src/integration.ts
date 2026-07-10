import { objectKeys, removeTrailingSlash } from "@homarr/common";
import type { AtLeastOneOf } from "@homarr/common/types";

import { createDocumentationLink } from "./docs";

export const integrationSecretKindObject = {
  apiKey: { isPublic: false, multiline: false },
  username: { isPublic: true, multiline: false },
  password: { isPublic: false, multiline: false },
  tokenId: { isPublic: true, multiline: false },
  realm: { isPublic: true, multiline: false },
  personalAccessToken: { isPublic: false, multiline: false },
  topic: { isPublic: true, multiline: false },
  opnsenseApiKey: { isPublic: false, multiline: false },
  opnsenseApiSecret: { isPublic: false, multiline: false },
  url: { isPublic: false, multiline: false },
  privateKey: { isPublic: false, multiline: true },
  githubAppId: { isPublic: true, multiline: false },
  githubInstallationId: { isPublic: true, multiline: false },
  slug: { isPublic: true, multiline: false },
} satisfies Record<string, { isPublic: boolean; multiline: boolean }>;

export const integrationSecretKinds = objectKeys(integrationSecretKindObject);

interface integrationDefinition {
  name: string;
  iconUrl: string;
  secretKinds: AtLeastOneOf<IntegrationSecretKind[]>; // at least one secret kind set is required
  category: AtLeastOneOf<IntegrationCategory>;
  documentationUrl: string | null;
  defaultUrl?: string;
  defaultPort?: number;
  apiKeySettingsPath?: string;
}

export const integrationDefs = {
  sabNzbd: {
    name: "SABnzbd",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/sabnzbd.svg",
    category: ["downloadClient", "usenet"],
    documentationUrl: createDocumentationLink("/docs/integrations/sabnzbd"),
    defaultPort: 8080,
    apiKeySettingsPath: "/config/general/",
  },
  nzbGet: {
    name: "NZBGet",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/nzbget.svg",
    category: ["downloadClient", "usenet"],
    documentationUrl: createDocumentationLink("/docs/integrations/nzbget"),
    defaultPort: 6789,
  },
  deluge: {
    name: "Deluge",
    secretKinds: [["password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/deluge.svg",
    category: ["downloadClient", "torrent"],
    documentationUrl: createDocumentationLink("/docs/integrations/deluge"),
    defaultPort: 8112,
  },
  transmission: {
    name: "Transmission",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/transmission.svg",
    category: ["downloadClient", "torrent"],
    documentationUrl: createDocumentationLink("/docs/integrations/transmission"),
    defaultPort: 9091,
  },
  qBittorrent: {
    name: "qBittorrent",
    secretKinds: [["apiKey"], ["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/qbittorrent.svg",
    category: ["downloadClient", "torrent"],
    documentationUrl: createDocumentationLink("/docs/integrations/q-bittorent"),
    defaultPort: 8080,
    apiKeySettingsPath: "/#/settings/webui",
  },
  aria2: {
    name: "Aria2",
    secretKinds: [[], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/PapirusDevelopmentTeam/papirus_icons@latest/src/system_downloads_3.svg",
    category: ["downloadClient", "torrent", "miscellaneous"],
    documentationUrl: createDocumentationLink("/docs/integrations/aria2"),
    defaultPort: 6800,
  },
  slskd: {
    name: "Slskd",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/slskd.svg",
    category: ["downloadClient", "miscellaneous"],
    documentationUrl: createDocumentationLink("/docs/integrations/slskd"),
    defaultPort: 5030,
  },
  sonarr: {
    name: "Sonarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/sonarr.svg",
    category: ["calendar"],
    documentationUrl: createDocumentationLink("/docs/integrations/sonarr"),
    defaultPort: 8989,
    apiKeySettingsPath: "/settings/general",
  },
  radarr: {
    name: "Radarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/radarr.svg",
    category: ["calendar"],
    documentationUrl: createDocumentationLink("/docs/integrations/radarr"),
    defaultPort: 7878,
    apiKeySettingsPath: "/settings/general",
  },
  lidarr: {
    name: "Lidarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/lidarr.svg",
    category: ["calendar"],
    documentationUrl: createDocumentationLink("/docs/integrations/lidarr"),
    defaultPort: 8686,
    apiKeySettingsPath: "/settings/general",
  },
  readarr: {
    name: "Readarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/readarr.svg",
    category: ["calendar"],
    documentationUrl: createDocumentationLink("/docs/integrations/readarr"),
    defaultPort: 8787,
    apiKeySettingsPath: "/settings/general",
  },
  prowlarr: {
    name: "Prowlarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/prowlarr.svg",
    category: ["indexerManager"],
    documentationUrl: createDocumentationLink("/docs/integrations/prowlarr"),
    defaultPort: 9696,
    apiKeySettingsPath: "/settings/general",
  },
  bazarr: {
    name: "Bazarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/bazarr.svg",
    category: ["subtitleManager"],
    documentationUrl: createDocumentationLink("/docs/integrations/bazarr"),
    defaultPort: 6767,
    apiKeySettingsPath: "/settings/general",
  },
  jellyfin: {
    name: "Jellyfin",
    secretKinds: [["username", "password"], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/jellyfin.svg",
    category: ["mediaService", "mediaRelease"],
    documentationUrl: createDocumentationLink("/docs/integrations/jellyfin"),
    defaultPort: 8096,
    apiKeySettingsPath: "/web/index.html#!/dashboard/keys",
  },
  emby: {
    name: "Emby",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/emby.svg",
    category: ["mediaService", "mediaRelease"],
    documentationUrl: createDocumentationLink("/docs/integrations/emby"),
    defaultPort: 8096,
  },
  plex: {
    name: "Plex",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/plex.svg",
    category: ["mediaService", "mediaRelease"],
    documentationUrl: createDocumentationLink("/docs/integrations/plex"),
    defaultPort: 32400,
  },
  jellyseerr: {
    name: "Jellyseerr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/jellyseerr.svg",
    category: ["mediaSearch", "mediaRequest", "search"],
    documentationUrl: createDocumentationLink("/docs/integrations/jellyseerr"),
    defaultPort: 5055,
    apiKeySettingsPath: "/settings",
  },
  seerr: {
    name: "Seerr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/seerr.svg",
    category: ["mediaSearch", "mediaRequest", "search"],
    documentationUrl: createDocumentationLink("/docs/integrations/seerr"),
    defaultPort: 5055,
    apiKeySettingsPath: "/settings",
  },
  overseerr: {
    name: "Overseerr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/overseerr.svg",
    category: ["mediaSearch", "mediaRequest", "search"],
    documentationUrl: createDocumentationLink("/docs/integrations/overseerr"),
    defaultPort: 5055,
    apiKeySettingsPath: "/settings",
  },
  piHole: {
    name: "Pi-hole",
    secretKinds: [["apiKey"], []],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/pi-hole.svg",
    category: ["dnsHole"],
    documentationUrl: createDocumentationLink("/docs/integrations/pi-hole"),
    defaultPort: 80,
  },
  adGuardHome: {
    name: "AdGuard Home",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/adguard-home.svg",
    category: ["dnsHole"],
    documentationUrl: createDocumentationLink("/docs/integrations/adguard-home"),
    defaultPort: 3000,
  },
  technitiumDns: {
    name: "Technitium DNS",
    secretKinds: [["apiKey"], ["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/technitium.svg",
    category: ["dnsHole"],
    documentationUrl: createDocumentationLink("/docs/integrations/technitium-dns"),
  },
  homeAssistant: {
    name: "Home Assistant",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/home-assistant.svg",
    category: ["smartHomeServer", "calendar"],
    documentationUrl: createDocumentationLink("/docs/integrations/home-assistant"),
    defaultPort: 8123,
  },
  openmediavault: {
    name: "OpenMediaVault",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/openmediavault.svg",
    category: ["healthMonitoring"],
    documentationUrl: createDocumentationLink("/docs/integrations/open-media-vault"),
    defaultPort: 80,
  },
  dashDot: {
    name: "Dash.",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/dashdot.png",
    category: ["healthMonitoring"],
    documentationUrl: createDocumentationLink("/docs/integrations/dash-dot"),
  },
  glances: {
    name: "Glances",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/glances.svg",
    category: ["healthMonitoring"],
    documentationUrl: null,
    defaultPort: 61208,
  },
  tdarr: {
    name: "Tdarr",
    secretKinds: [[], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/tdarr.png",
    category: ["mediaTranscoding"],
    documentationUrl: createDocumentationLink("/docs/integrations/tdarr"),
    defaultPort: 8265,
  },
  proxmox: {
    name: "Proxmox",
    secretKinds: [["username", "tokenId", "apiKey", "realm"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/proxmox.svg",
    category: ["healthMonitoring"],
    documentationUrl: createDocumentationLink("/docs/integrations/proxmox"),
    defaultPort: 8006,
  },
  nextcloud: {
    name: "Nextcloud",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/nextcloud.svg",
    category: ["calendar", "notifications"],
    documentationUrl: createDocumentationLink("/docs/integrations/nextcloud"),
    defaultPort: 443,
  },
  unifiController: {
    name: "Unifi Controller",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/unifi.png",
    category: ["networkController"],
    documentationUrl: createDocumentationLink("/docs/integrations/unifi-controller"),
    defaultPort: 8443,
  },
  opnsense: {
    name: "OPNsense",
    secretKinds: [["opnsenseApiKey", "opnsenseApiSecret"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/opnsense.svg",
    category: ["firewall"],
    documentationUrl: createDocumentationLink("/docs/integrations/opnsense"),
    defaultPort: 443,
  },
  ntfy: {
    name: "ntfy",
    secretKinds: [["topic"], ["topic", "apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/ntfy.svg",
    category: ["notifications"],
    documentationUrl: createDocumentationLink("/docs/integrations/ntfy"),
    defaultPort: 80,
  },
  gotify: {
    name: "Gotify",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/gotify.svg",
    category: ["notifications"],
    documentationUrl: createDocumentationLink("/docs/integrations/gotify"),
  },
  ical: {
    name: "iCal",
    secretKinds: [["url"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/ical.svg",
    category: ["calendar"],
    documentationUrl: createDocumentationLink("/docs/integrations/ical"),
  },
  anchor: {
    name: "Anchor",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/anchor.svg",
    category: ["notes"],
    documentationUrl: createDocumentationLink("/docs/integrations/anchor"),
    defaultPort: 8080,
  },
  truenas: {
    name: "TrueNAS",
    secretKinds: [["username", "password"], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/truenas.svg",
    category: ["healthMonitoring"],
    documentationUrl: createDocumentationLink("/docs/integrations/truenas"),
    defaultPort: 80,
  },
  synology: {
    name: "Synology DiskStation",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/synology.svg",
    category: ["healthMonitoring"],
    documentationUrl: createDocumentationLink("/docs/integrations/synology"),
    defaultPort: 5000,
  },
  unraid: {
    name: "Unraid",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/unraid.svg",
    category: ["healthMonitoring"],
    documentationUrl: createDocumentationLink("/docs/integrations/unraid"),
    defaultPort: 80,
  },
  coolify: {
    name: "Coolify",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/coolify.svg",
    category: ["healthMonitoring"],
    documentationUrl: createDocumentationLink("/docs/integrations/coolify"),
    defaultPort: 8000,
  },
  immich: {
    name: "Immich",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/immich.svg",
    category: ["photoService"],
    documentationUrl: createDocumentationLink("/docs/integrations/immich"),
    defaultPort: 2283,
  },
  paperlessNgx: {
    name: "Paperless-ngx",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/paperless-ngx.svg",
    category: ["documents"],
    documentationUrl: null,
    defaultPort: 8000,
  },
  tracearr: {
    name: "Tracearr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/tracearr.svg",
    category: ["mediaMonitoring"],
    documentationUrl: createDocumentationLink("/docs/integrations/tracearr"),
    defaultPort: 7040,
  },
  speedtestTracker: {
    name: "Speedtest Tracker",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/speedtest-tracker.png",
    category: ["speedtest"],
    documentationUrl: createDocumentationLink("/docs/integrations/speedtest-tracker"),
    defaultPort: 80,
  },
  uptimeKuma: {
    name: "Uptime Kuma",
    secretKinds: [[], ["slug"], ["slug", "apiKey"], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/uptime-kuma.svg",
    category: ["uptimeMonitoring"],
    documentationUrl: null,
    defaultPort: 3001,
  },
  audiobookshelf: {
    name: "Audiobookshelf",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/audiobookshelf.svg",
    category: ["mediaLibrary"],
    documentationUrl: null,
    defaultPort: 13378,
    apiKeySettingsPath: "/account",
  },
  navidrome: {
    name: "Navidrome",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/navidrome.svg",
    category: ["mediaLibrary"],
    documentationUrl: null,
    defaultPort: 4533,
  },
  umami: {
    name: "Umami",
    secretKinds: [["username", "password"], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/umami.svg",
    category: ["analytics"],
    defaultUrl: "https://api.umami.is/v1",
    documentationUrl: createDocumentationLink("/docs/integrations/umami"),
    defaultPort: 3000,
  },
  peaNut: {
    name: "PeaNUT",
    secretKinds: [["username", "password"], []],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/peanut.svg",
    category: ["ups"],
    documentationUrl: null,
  },
  beszel: {
    name: "Beszel",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/beszel.svg",
    category: ["healthMonitoring"],
    documentationUrl: createDocumentationLink("/docs/integrations/beszel"),
    defaultPort: 8090,
  },
  gluetun: {
    name: "Gluetun",
    secretKinds: [["username", "password"], ["apiKey"], []],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/gluetun.svg",
    category: ["vpn"],
    documentationUrl: createDocumentationLink("/docs/integrations/gluetun"),
  },
  traefik: {
    name: "Traefik",
    secretKinds: [[], ["username", "password"], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/traefik.svg",
    category: ["reverseProxy"],
    documentationUrl: createDocumentationLink("/docs/integrations/traefik"),
    defaultPort: 8080,
  },
  archiveTeamWarrior: {
    name: "ArchiveTeam Warrior",
    secretKinds: [[], ["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/png/archiveteam-warrior.png",
    category: ["archiving"],
    documentationUrl: null,
    defaultUrl: "http://localhost:8001",
  },
  // This integration only returns mock data, it is used during development (but can also be used in production by directly going to the create page)
  mock: {
    name: "Mock",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/vitest.svg",
    category: [
      "calendar",
      "dnsHole",
      "downloadClient",
      "healthMonitoring",
      "indexerManager",
      "mediaRelease",
      "mediaRequest",
      "mediaService",
      "mediaTranscoding",
      "networkController",
      "notifications",
      "smartHomeServer",
      "ups",
      "uptimeMonitoring",
    ],
    documentationUrl: null,
  },
} as const satisfies Record<string, integrationDefinition>;

export const integrationKinds = objectKeys(integrationDefs) as AtLeastOneOf<IntegrationKind>;

export const getIconUrl = (integration: IntegrationKind) => integrationDefs[integration].iconUrl;

export const getIntegrationName = (integration: IntegrationKind) => integrationDefs[integration].name;

export const getDefaultSecretKinds = (integration: IntegrationKind): IntegrationSecretKind[] =>
  integrationDefs[integration].secretKinds[0];

export const getAllSecretKindOptions = (integration: IntegrationKind): AtLeastOneOf<IntegrationSecretKind[]> =>
  integrationDefs[integration].secretKinds;

export const getIntegrationDefaultUrl = (integration: IntegrationKind) => {
  const definition = integrationDefs[integration];
  return "defaultUrl" in definition ? definition.defaultUrl : undefined;
};

export const getIntegrationDefaultPort = (kind: IntegrationKind): number | undefined => {
  const definition = integrationDefs[kind];
  return "defaultPort" in definition ? definition.defaultPort : undefined;
};

export const getIntegrationApiKeyUrl = (integrationUrl: string, kind: IntegrationKind): string | null => {
  const definition = integrationDefs[kind];
  if (!("apiKeySettingsPath" in definition)) return null;
  const base = removeTrailingSlash(integrationUrl);
  if (!base) return null;
  return `${base}${definition.apiKeySettingsPath}`;
};

/**
 * Get all integration kinds that share a category, typed only by the kinds belonging to the category
 * @param category Category to filter by, belonging to IntegrationCategory
 * @returns Partial list of integration kinds
 */
export const getIntegrationKindsByCategory = <TCategory extends IntegrationCategory>(category: TCategory) => {
  return objectKeys(integrationDefs).filter((integration) =>
    integrationDefs[integration].category.some((defCategory) => defCategory === category),
  ) as AtLeastOneOf<IntegrationKindByCategory<TCategory>>;
};

/**
 * Directly get the types of the list returned by getIntegrationKindsByCategory
 */
export type IntegrationKindByCategory<TCategory extends IntegrationCategory> = {
  [Key in keyof typeof integrationDefs]: TCategory extends (typeof integrationDefs)[Key]["category"][number]
    ? Key
    : never;
}[keyof typeof integrationDefs] extends infer U
  ? //Needed to simplify the type when using it
    U
  : never;

export type IntegrationSecretKind = keyof typeof integrationSecretKindObject;
export type IntegrationKind = keyof typeof integrationDefs;

export const integrationCategories = [
  "dnsHole",
  "mediaService",
  "calendar",
  "mediaSearch",
  "mediaRelease",
  "mediaRequest",
  "downloadClient",
  "usenet",
  "torrent",
  "miscellaneous",
  "smartHomeServer",
  "indexerManager",
  "healthMonitoring",
  "search",
  "mediaTranscoding",
  "networkController",
  "notifications",
  "firewall",
  "timetable",
  "photoService",
  "notes",
  "mediaMonitoring",
  "speedtest",
  "analytics",
  "vpn",
  "archiving",
  "ups",
  "documents",
  "mediaLibrary",
  "uptimeMonitoring",
  "subtitleManager",
  "reverseProxy",
] as const;

export type IntegrationCategory = (typeof integrationCategories)[number];
