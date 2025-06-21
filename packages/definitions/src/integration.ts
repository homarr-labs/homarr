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
  containerImages?: string[]; // Optional, used for container images to suggest in the UI
}

export const integrationDefs = {
  sabNzbd: {
    name: "SABnzbd",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/sabnzbd.svg",
    category: ["downloadClient", "usenet"],
    containerImages: ["linuxserver/sabnzbd", "lscr.io/linuxserver/sabnzbd", "ghcr.io/linuxserver/sabnzbd"],
  },
  nzbGet: {
    name: "NZBGet",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/nzbget.svg",
    category: ["downloadClient", "usenet"],
    containerImages: [
      "nzbgetcom/nzbget",
      "ghcr.io/nzbgetcom/nzbget",
      "linuxserver/nzbget",
      "lscr.io/linuxserver/nzbget",
      "ghcr.io/linuxserver/nzbget",
    ],
  },
  deluge: {
    name: "Deluge",
    secretKinds: [["password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/deluge.svg",
    category: ["downloadClient", "torrent"],
    containerImages: ["linuxserver/deluge", "lscr.io/linuxserver/deluge", "ghcr.io/linuxserver/deluge"],
  },
  transmission: {
    name: "Transmission",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/transmission.svg",
    category: ["downloadClient", "torrent"],
    containerImages: [
      "linuxserver/transmission",
      "lscr.io/linuxserver/transmission",
      "ghcr.io/linuxserver/transmission",
    ],
  },
  qBittorrent: {
    name: "qBittorrent",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/qbittorrent.svg",
    category: ["downloadClient", "torrent"],
    containerImages: ["linuxserver/qbittorrent", "lscr.io/linuxserver/qbittorrent", "ghcr.io/linuxserver/qbittorrent"],
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
    containerImages: [
      "hotio/sonarr",
      "ghcr.io/hotio/sonarr",
      "linuxserver/sonarr",
      "lscr.io/linuxserver/sonarr",
      "ghcr.io/linuxserver/sonarr",
    ],
  },
  radarr: {
    name: "Radarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/radarr.svg",
    category: ["calendar"],
    containerImages: [
      "hotio/radarr",
      "ghcr.io/hotio/radarr",
      "linuxserver/radarr",
      "lscr.io/linuxserver/radarr",
      "ghcr.io/linuxserver/radarr",
    ],
  },
  lidarr: {
    name: "Lidarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/lidarr.svg",
    category: ["calendar"],
    containerImages: [
      "hotio/lidarr",
      "ghcr.io/hotio/lidarr",
      "linuxserver/lidarr",
      "lscr.io/linuxserver/lidarr",
      "ghcr.io/linuxserver/lidarr",
    ],
  },
  readarr: {
    name: "Readarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/readarr.svg",
    category: ["calendar"],
    containerImages: [
      "hotio/readarr",
      "ghcr.io/hotio/readarr",
      "linuxserver/readarr",
      "lscr.io/linuxserver/readarr",
      "ghcr.io/linuxserver/readarr",
    ],
  },
  prowlarr: {
    name: "Prowlarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/prowlarr.svg",
    category: ["indexerManager"],
    containerImages: [
      "hotio/prowlarr",
      "ghcr.io/hotio/prowlarr",
      "linuxserver/prowlarr",
      "lscr.io/linuxserver/prowlarr",
      "ghcr.io/linuxserver/prowlarr",
    ],
  },
  jellyfin: {
    name: "Jellyfin",
    secretKinds: [["username", "password"], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/jellyfin.svg",
    category: ["mediaService"],
    containerImages: [
      "jellyfin/jellyfin",
      "ghcr.io/jellyfin/jellyfin",
      "linuxserver/jellyfin",
      "lscr.io/linuxserver/jellyfin",
      "ghcr.io/linuxserver/jellyfin",
    ],
  },
  emby: {
    name: "Emby",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/emby.svg",
    category: ["mediaService"],
    containerImages: [
      "emby/embyserver",
      "emby/embyserver_arm64v8",
      "emby/embyserver_arm32v7",
      "linuxserver/emby",
      "lscr.io/linuxserver/emby",
      "ghcr.io/linuxserver/emby",
    ],
  },
  plex: {
    name: "Plex",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/plex.svg",
    category: ["mediaService"],
    containerImages: ["plexinc/pms-docker", "linuxserver/plex", "lscr.io/linuxserver/plex", "ghcr.io/linuxserver/plex"],
  },
  jellyseerr: {
    name: "Jellyseerr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/jellyseerr.svg",
    category: ["mediaSearch", "mediaRequest", "search"],
    containerImages: ["fallenbagel/jellyseerr", "ghcr.io/fallenbagel/jellyseerr"],
  },
  overseerr: {
    name: "Overseerr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/overseerr.svg",
    category: ["mediaSearch", "mediaRequest", "search"],
    containerImages: [
      "sct/overseerr",
      "linuxserver/overseerr",
      "lscr.io/linuxserver/overseerr",
      "ghcr.io/linuxserver/overseerr",
    ],
  },
  piHole: {
    name: "Pi-hole",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/pi-hole.svg",
    category: ["dnsHole"],
    containerImages: ["pihole/pihole"],
  },
  adGuardHome: {
    name: "AdGuard Home",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/adguard-home.svg",
    category: ["dnsHole"],
    containerImages: ["adguard/adguardhome"],
  },
  homeAssistant: {
    name: "Home Assistant",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/home-assistant.svg",
    category: ["smartHomeServer"],
    containerImages: [
      "homeassistant/home-assistant",
      "linuxserver/home-assistant",
      "lscr.io/linuxserver/home-assistant",
      "ghcr.io/linuxserver/home-assistant",
    ],
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
    containerImages: ["mauricenino/dashdot", "ghcr.io/mauricenino/dashdot"],
  },
  tdarr: {
    name: "Tdarr",
    secretKinds: [[], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/tdarr.png",
    category: ["mediaTranscoding"],
    containerImages: ["haveagitgat/tdarr", "ghcr.io/haveagitgat/tdarr"],
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
    containerImages: [
      "jacobalberty/unifi",
      "ghcr.io/jacobalberty/unifi",
      "linuxserver/unifi-controller",
      "lscr.io/linuxserver/unifi-controller",
      "ghcr.io/linuxserver/unifi-controller",
      "linuxserver/unifi-network-application",
      "lscr.io/linuxserver/unifi-network-application",
      "ghcr.io/linuxserver/unifi-network-application",
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
  | "miscellaneous"
  | "smartHomeServer"
  | "indexerManager"
  | "healthMonitoring"
  | "search"
  | "mediaTranscoding"
  | "networkController";
