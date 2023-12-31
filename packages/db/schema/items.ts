import { objectKeys } from "@homarr/common";

export const integrationSecretSortObject = {
  apiKey: { isPublic: false },
  username: { isPublic: true },
  password: { isPublic: false },
} satisfies Record<string, { isPublic: boolean }>;

export const integrationSecretSort = objectKeys(integrationSecretSortObject);

export const integrations = {
  sabNzbd: {
    secretsSorts: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/sabnzbd.png",
    category: ["useNetClient"],
  },
  nzbGet: {
    secretsSorts: ["username", "password"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/nzbget.png",
    category: ["useNetClient"],
  },
  deluge: {
    secretsSorts: ["password"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/deluge.png",
    category: ["downloadClient"],
  },
  transmission: {
    secretsSorts: ["username", "password"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/transmission.png",
    category: ["downloadClient"],
  },
  qBitTorrent: {
    secretsSorts: ["username", "password"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/qbittorrent.png",
    category: ["downloadClient"],
  },
  jellyseerr: {
    secretsSorts: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/jellyseerr.png",
    category: ["mediaSearch", "mediaRequest"],
  },
  overseerr: {
    secretsSorts: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/overseerr.png",
    category: ["mediaSearch", "mediaRequest"],
  },
  sonarr: {
    secretsSorts: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/sonarr.png",
    category: ["calendar"],
  },
  radarr: {
    secretsSorts: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/radarr.png",
    category: ["calendar"],
  },
  lidarr: {
    secretsSorts: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/lidarr.png",
    category: ["calendar"],
  },
  readarr: {
    secretsSorts: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/readarr.png",
    category: ["calendar"],
  },
  jellyfin: {
    secretsSorts: ["username", "password"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/jellyfin.png",
    category: ["mediaService"],
  },
  plex: {
    secretsSorts: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/plex.png",
    category: ["mediaService"],
  },
  piHole: {
    secretsSorts: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/pi-hole.png",
    category: ["dnsHole"],
  },
  adGuardHome: {
    secretsSorts: ["username", "password"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/adguard-home.png",
    category: ["dnsHole"],
  },
  homeAssistant: {
    secretsSorts: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/home-assistant.png",
    category: [],
  },
} satisfies Record<
  string,
  {
    iconUrl: string;
    secretsSorts: IntegrationSecretSort[];
    category: IntegrationCategory[];
  }
>;

export const getIconUrl = (integration: IntegrationSort) =>
  integrations[integration]?.iconUrl ?? null;

export const getSecretSorts = (
  integration: IntegrationSort,
): IntegrationSecretSort[] => integrations[integration]?.secretsSorts ?? null;

export const integrationSorts = objectKeys(integrations);

export type IntegrationSecretSort = (typeof integrationSecretSort)[number];
export type IntegrationSort = (typeof integrationSorts)[number];
export type IntegrationCategory =
  | "dnsHole"
  | "mediaService"
  | "calendar"
  | "mediaSearch"
  | "mediaRequest"
  | "downloadClient"
  | "useNetClient";
