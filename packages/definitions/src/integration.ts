import { objectKeys } from "@homarr/common";
import type { AtLeastOneOf } from "@homarr/common/types";

export const integrationSecretKindObject = {
  apiKey: { isPublic: false },
  username: { isPublic: true },
  password: { isPublic: false },
  tokenId: { isPublic: true },
  realm: { isPublic: true },
} satisfies Record<string, { isPublic: boolean }>;

export const integrationSecretKinds = objectKeys(integrationSecretKindObject);

interface integrationDefinition {
  name: string;
  iconUrl: string;
  secretKinds: AtLeastOneOf<IntegrationSecretKind[]>; // at least one secret kind set is required
  category: AtLeastOneOf<IntegrationCategory>;
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
    category: ["healthMonitoring"],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/dashdot.png",
  },
  tdarr: {
    name: "Tdarr",
    secretKinds: [[]],
    category: ["mediaTranscoding"],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/tdarr.png",
  },
  proxmox: {
    name: "Proxmox",
    secretKinds: [["username", "tokenId", "apiKey", "realm"]],
    category: ["healthMonitoring"],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/proxmox.svg",
  },
} as const satisfies Record<string, integrationDefinition>;

export const integrationKinds = objectKeys(integrationDefs) as AtLeastOneOf<IntegrationKind>;

export const getIconUrl = (integration: IntegrationKind) => integrationDefs[integration].iconUrl;

export const getIntegrationName = (integration: IntegrationKind) => integrationDefs[integration].name;

export const getDefaultSecretKinds = (integration: IntegrationKind): IntegrationSecretKind[] =>
  integrationDefs[integration].secretKinds[0];

export const getAllSecretKindOptions = (integration: IntegrationKind): AtLeastOneOf<IntegrationSecretKind[]> =>
  integrationDefs[integration].secretKinds;

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
export type IntegrationCategory =
  | "dnsHole"
  | "mediaService"
  | "calendar"
  | "mediaSearch"
  | "mediaRequest"
  | "downloadClient"
  | "usenet"
  | "torrent"
  | "smartHomeServer"
  | "indexerManager"
  | "healthMonitoring"
  | "search"
  | "mediaTranscoding";
