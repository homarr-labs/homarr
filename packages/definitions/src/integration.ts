import { objectKeys } from "@homarr/common";
import type { AtLeastOneOf } from "@homarr/common/types";

export const integrationSecretKindObject = {
  apiKey: { isPublic: false },
  username: { isPublic: true },
  password: { isPublic: false },
} satisfies Record<string, { isPublic: boolean }>;

export const integrationSecretKinds = objectKeys(integrationSecretKindObject);

interface integrationDefinition {
  name: string;
  iconUrl: string;
  secretKinds: AtLeastOneOf<IntegrationSecretKind[]>; // at least one secret kind set is required
  category: AtLeastOneOf<IntegrationCategory>;
  supportsSearch: boolean;
}

export const integrationDefs = {
  sabNzbd: {
    name: "SABnzbd",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/sabnzbd.png",
    category: ["downloadClient", "usenet"],
    supportsSearch: false
  },
  nzbGet: {
    name: "NZBGet",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/nzbget.png",
    category: ["downloadClient", "usenet"],
    supportsSearch: false
  },
  deluge: {
    name: "Deluge",
    secretKinds: [["password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/deluge.png",
    category: ["downloadClient", "torrent"],
    supportsSearch: false
  },
  transmission: {
    name: "Transmission",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/transmission.png",
    category: ["downloadClient", "torrent"],
    supportsSearch: false
  },
  qBittorrent: {
    name: "qBittorrent",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/qbittorrent.png",
    category: ["downloadClient", "torrent"],
    supportsSearch: false
  },
  sonarr: {
    name: "Sonarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/sonarr.png",
    category: ["calendar"],
    supportsSearch: false
  },
  radarr: {
    name: "Radarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/radarr.png",
    category: ["calendar"],
    supportsSearch: false
  },
  lidarr: {
    name: "Lidarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/lidarr.png",
    category: ["calendar"],
    supportsSearch: false
  },
  readarr: {
    name: "Readarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/readarr.png",
    category: ["calendar"],
    supportsSearch: false
  },
  prowlarr: {
    name: "Prowlarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/prowlarr.png",
    category: ["indexerManager"],
    supportsSearch: false
  },
  jellyfin: {
    name: "Jellyfin",
    secretKinds: [["username", "password"], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/jellyfin.png",
    category: ["mediaService"],
    supportsSearch: false
  },
  plex: {
    name: "Plex",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/plex.png",
    category: ["mediaService"],
    supportsSearch: false
  },
  jellyseerr: {
    name: "Jellyseerr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/jellyseerr.png",
    category: ["mediaSearch", "mediaRequest"],
    supportsSearch: true
  },
  overseerr: {
    name: "Overseerr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/overseerr.png",
    category: ["mediaSearch", "mediaRequest"],
    supportsSearch: true
  },
  piHole: {
    name: "Pi-hole",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/pi-hole.png",
    category: ["dnsHole"],
    supportsSearch: false
  },
  adGuardHome: {
    name: "AdGuard Home",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/adguard-home.png",
    category: ["dnsHole"],
    supportsSearch: false
  },
  homeAssistant: {
    name: "Home Assistant",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/home-assistant.png",
    category: ["smartHomeServer"],
    supportsSearch: false
  },
  openmediavault: {
    name: "OpenMediaVault",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/openmediavault.png",
    category: ["healthMonitoring"],
    supportsSearch: false
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
  | "healthMonitoring";
