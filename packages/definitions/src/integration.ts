import { objectKeys } from "@homarr/common";

export const integrationSecretKindObject = {
  apiKey: { isPublic: false },
  username: { isPublic: true },
  password: { isPublic: false },
} satisfies Record<string, { isPublic: boolean }>;

export const integrationSecretKinds = objectKeys(integrationSecretKindObject);

export const integrationDefs = {
  sabNzbd: {
    name: "SABnzbd",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/sabnzbd.png",
    category: ["downloadClient", "usenet"],
  },
  nzbGet: {
    name: "NZBGet",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/nzbget.png",
    category: ["downloadClient", "usenet"],
  },
  deluge: {
    name: "Deluge",
    secretKinds: [["password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/deluge.png",
    category: ["downloadClient", "torrent"],
  },
  transmission: {
    name: "Transmission",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/transmission.png",
    category: ["downloadClient", "torrent"],
  },
  qBittorrent: {
    name: "qBittorrent",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/qbittorrent.png",
    category: ["downloadClient", "torrent"],
  },
  sonarr: {
    name: "Sonarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/sonarr.png",
    category: ["calendar"],
  },
  radarr: {
    name: "Radarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/radarr.png",
    category: ["calendar"],
  },
  lidarr: {
    name: "Lidarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/lidarr.png",
    category: ["calendar"],
  },
  readarr: {
    name: "Readarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/readarr.png",
    category: ["calendar"],
  },
  jellyfin: {
    name: "Jellyfin",
    secretKinds: [["username", "password"], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/jellyfin.png",
    category: ["mediaService"],
  },
  plex: {
    name: "Plex",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/plex.png",
    category: ["mediaService"],
  },
  jellyseerr: {
    name: "Jellyseerr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/jellyseerr.png",
    category: ["mediaSearch", "mediaRequest"],
  },
  overseerr: {
    name: "Overseerr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/overseerr.png",
    category: ["mediaSearch", "mediaRequest"],
  },
  piHole: {
    name: "Pi-hole",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/pi-hole.png",
    category: ["dnsHole"],
  },
  adGuardHome: {
    name: "AdGuard Home",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/adguard-home.png",
    category: ["dnsHole"],
  },
  homeAssistant: {
    name: "Home Assistant",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/home-assistant.png",
    category: ["smartHomeServer"],
  },
} satisfies Record<
  string,
  {
    name: string;
    iconUrl: string;
    secretKinds: [IntegrationSecretKind[], ...IntegrationSecretKind[][]]; // at least one secret kind set is required
    category: IntegrationCategory[];
  }
>;

export const getIconUrl = (integration: IntegrationKind) => integrationDefs[integration].iconUrl;

export const getIntegrationName = (integration: IntegrationKind) => integrationDefs[integration].name;

export const getDefaultSecretKinds = (integration: IntegrationKind): IntegrationSecretKind[] =>
  integrationDefs[integration].secretKinds[0];

export const getAllSecretKindOptions = (
  integration: IntegrationKind,
): [IntegrationSecretKind[], ...IntegrationSecretKind[][]] => integrationDefs[integration].secretKinds;

export const integrationKinds = objectKeys(integrationDefs);

/**
 * Directly get the types of the list returned by getIntegrationKindsByCategory
 */
export type IntegrationKindByCategory<TCategory extends IntegrationCategory> = {
  [Key in keyof typeof integrationDefs]: TCategory extends (typeof integrationDefs)[Key]["category"][number]
    ? Key
    : never;
}[keyof typeof integrationDefs] extends infer U
  //Needed to simplify the type when using it
  ? U
  : never;

/**
 * Get all integration kinds that share a category, typed only by the kinds belonging to the category
 * @param category Category to filter by, belonging to IntegrationCategory
 * @returns Partial list of integration kinds
 */
export const getIntegrationKindsByCategory = <TCategory extends IntegrationCategory>(category: TCategory) => {
  return integrationKinds.filter((integration) =>
    integrationDefs[integration].category.some((defCategory) => defCategory === category),
  ) as IntegrationKindByCategory<TCategory>[];
};

export type IntegrationSecretKind = (typeof integrationSecretKinds)[number];
export type IntegrationKind = (typeof integrationKinds)[number];
export type IntegrationCategory =
  | "dnsHole"
  | "mediaService"
  | "calendar"
  | "mediaSearch"
  | "mediaRequest"
  | "downloadClient"
  | "usenet"
  | "torrent"
  | "smartHomeServer";
