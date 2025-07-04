import { objectKeys } from "@homarr/common";
import type { AtLeastOneOf } from "@homarr/common/types";

export const integrationSecretKindObject = {
  apiKey: { isPublic: false },
  username: { isPublic: true },
  password: { isPublic: false },
  tokenId: { isPublic: true },
  realm: { isPublic: true },
  personalAccessToken: { isPublic: false },
  topic: { isPublic: true },
} satisfies Record<string, { isPublic: boolean }>;

export const integrationSecretKinds = objectKeys(integrationSecretKindObject);

interface integrationDefinition {
  name: string;
  iconUrl: string;
  secretKinds: AtLeastOneOf<IntegrationSecretKind[]>; // at least one secret kind set is required
  category: AtLeastOneOf<IntegrationCategory>;
  defaultUrl?: string; // optional default URL for the integration
}

export const integrationDefs = {
  sabNzbd: {
    name: "SABnzbd",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/sabnzbd.svg",
    category: ["downloadClient", "usenet"],
  },
  nzbGet: {
    name: "NZBGet",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/nzbget.svg",
    category: ["downloadClient", "usenet"],
  },
  deluge: {
    name: "Deluge",
    secretKinds: [["password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/deluge.svg",
    category: ["downloadClient", "torrent"],
  },
  transmission: {
    name: "Transmission",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/transmission.svg",
    category: ["downloadClient", "torrent"],
  },
  qBittorrent: {
    name: "qBittorrent",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/qbittorrent.svg",
    category: ["downloadClient", "torrent"],
  },
  aria2: {
    name: "Aria2",
    secretKinds: [[], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/PapirusDevelopmentTeam/papirus_icons@latest/src/system_downloads_3.svg",
    category: ["downloadClient", "torrent", "miscellaneous"],
  },
  sonarr: {
    name: "Sonarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/sonarr.svg",
    category: ["calendar"],
  },
  radarr: {
    name: "Radarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/radarr.svg",
    category: ["calendar"],
  },
  lidarr: {
    name: "Lidarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/lidarr.svg",
    category: ["calendar"],
  },
  readarr: {
    name: "Readarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/readarr.svg",
    category: ["calendar"],
  },
  prowlarr: {
    name: "Prowlarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/prowlarr.svg",
    category: ["indexerManager"],
  },
  jellyfin: {
    name: "Jellyfin",
    secretKinds: [["username", "password"], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/jellyfin.svg",
    category: ["mediaService"],
  },
  emby: {
    name: "Emby",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/emby.svg",
    category: ["mediaService"],
  },
  plex: {
    name: "Plex",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/plex.svg",
    category: ["mediaService"],
  },
  jellyseerr: {
    name: "Jellyseerr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/jellyseerr.svg",
    category: ["mediaSearch", "mediaRequest", "search"],
  },
  overseerr: {
    name: "Overseerr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/overseerr.svg",
    category: ["mediaSearch", "mediaRequest", "search"],
  },
  piHole: {
    name: "Pi-hole",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/pi-hole.svg",
    category: ["dnsHole"],
  },
  adGuardHome: {
    name: "AdGuard Home",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/adguard-home.svg",
    category: ["dnsHole"],
  },
  homeAssistant: {
    name: "Home Assistant",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/home-assistant.svg",
    category: ["smartHomeServer"],
  },
  openmediavault: {
    name: "OpenMediaVault",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/openmediavault.svg",
    category: ["healthMonitoring"],
  },
  dashDot: {
    name: "Dash.",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/dashdot.png",
    category: ["healthMonitoring"],
  },
  tdarr: {
    name: "Tdarr",
    secretKinds: [[], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/tdarr.png",
    category: ["mediaTranscoding"],
  },
  proxmox: {
    name: "Proxmox",
    secretKinds: [["username", "tokenId", "apiKey", "realm"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/proxmox.svg",
    category: ["healthMonitoring"],
  },
  nextcloud: {
    name: "Nextcloud",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/nextcloud.svg",
    category: ["calendar"],
  },
  unifiController: {
    name: "Unifi Controller",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/unifi.png",
    category: ["networkController"],
  },
  github: {
    name: "Github",
    secretKinds: [[], ["personalAccessToken"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/github.svg",
    category: ["releasesProvider"],
    defaultUrl: "https://api.github.com",
  },
  dockerHub: {
    name: "Docker Hub",
    secretKinds: [[], ["username", "personalAccessToken"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/docker.svg",
    category: ["releasesProvider"],
    defaultUrl: "https://hub.docker.com",
  },
  gitlab: {
    name: "Gitlab",
    secretKinds: [[], ["personalAccessToken"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/gitlab.svg",
    category: ["releasesProvider"],
    defaultUrl: "https://gitlab.com",
  },
  npm: {
    name: "NPM",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/loganmarchione/homelab-svg-assets//assets/npm.svg",
    category: ["releasesProvider"],
    defaultUrl: "https://registry.npmjs.org",
  },
  codeberg: {
    name: "Codeberg",
    secretKinds: [[], ["personalAccessToken"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/codeberg.svg",
    category: ["releasesProvider"],
    defaultUrl: "https://codeberg.org",
  },
  ntfy: {
    name: "ntfy",
    secretKinds: [["topic"], ["topic", "apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/ntfy.svg",
    category: ["notifications"],
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
      "mediaRequest",
      "mediaService",
      "mediaTranscoding",
      "networkController",
      "notifications",
      "smartHomeServer",
    ],
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

export const IntegrationCategories = [
  "dnsHole",
  "mediaService",
  "calendar",
  "mediaSearch",
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
  "releasesProvider",
  "notifications",
] as const;

export type IntegrationCategory = (typeof IntegrationCategories)[number];
