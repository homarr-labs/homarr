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
    category: ["useNetClient"],
  },
  nzbGet: {
    name: "NZBGet",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/nzbget.png",
    category: ["useNetClient"],
  },
  deluge: {
    name: "Deluge",
    secretKinds: [["password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/deluge.png",
    category: ["downloadClient"],
  },
  transmission: {
    name: "Transmission",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/transmission.png",
    category: ["downloadClient"],
  },
  qBittorrent: {
    name: "qBittorrent",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/qbittorrent.png",
    category: ["downloadClient"],
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
    category: [],
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

export const getIconUrl = (integration: IntegrationKind) => integrationDefs[integration]?.iconUrl ?? null;

export const getIntegrationName = (integration: IntegrationKind) => integrationDefs[integration].name;

export const getDefaultSecretKinds = (integration: IntegrationKind): IntegrationSecretKind[] =>
  integrationDefs[integration]?.secretKinds[0];

export const getAllSecretKindOptions = (
  integration: IntegrationKind,
): [IntegrationSecretKind[], ...IntegrationSecretKind[][]] => integrationDefs[integration]?.secretKinds;

export const integrationKinds = objectKeys(integrationDefs);

export type IntegrationSecretKind = (typeof integrationSecretKinds)[number];
export type IntegrationKind = (typeof integrationKinds)[number];
export type IntegrationCategory =
  | "dnsHole"
  | "mediaService"
  | "calendar"
  | "mediaSearch"
  | "mediaRequest"
  | "downloadClient"
  | "useNetClient";
