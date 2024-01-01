import { objectKeys } from "@homarr/common";

export const integrationSecretKindObject = {
  apiKey: { isPublic: false },
  username: { isPublic: true },
  password: { isPublic: false },
} satisfies Record<string, { isPublic: boolean }>;

export const integrationSecretKinds = objectKeys(integrationSecretKindObject);

export const integrationDefs = {
  sabNzbd: {
    secretKinds: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/sabnzbd.png",
    category: ["useNetClient"],
  },
  nzbGet: {
    secretKinds: ["username", "password"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/nzbget.png",
    category: ["useNetClient"],
  },
  deluge: {
    secretKinds: ["password"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/deluge.png",
    category: ["downloadClient"],
  },
  transmission: {
    secretKinds: ["username", "password"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/transmission.png",
    category: ["downloadClient"],
  },
  qBitTorrent: {
    secretKinds: ["username", "password"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/qbittorrent.png",
    category: ["downloadClient"],
  },
  jellyseerr: {
    secretKinds: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/jellyseerr.png",
    category: ["mediaSearch", "mediaRequest"],
  },
  overseerr: {
    secretKinds: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/overseerr.png",
    category: ["mediaSearch", "mediaRequest"],
  },
  sonarr: {
    secretKinds: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/sonarr.png",
    category: ["calendar"],
  },
  radarr: {
    secretKinds: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/radarr.png",
    category: ["calendar"],
  },
  lidarr: {
    secretKinds: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/lidarr.png",
    category: ["calendar"],
  },
  readarr: {
    secretKinds: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/readarr.png",
    category: ["calendar"],
  },
  jellyfin: {
    secretKinds: ["username", "password"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/jellyfin.png",
    category: ["mediaService"],
  },
  plex: {
    secretKinds: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/plex.png",
    category: ["mediaService"],
  },
  piHole: {
    secretKinds: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/pi-hole.png",
    category: ["dnsHole"],
  },
  adGuardHome: {
    secretKinds: ["username", "password"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/adguard-home.png",
    category: ["dnsHole"],
  },
  homeAssistant: {
    secretKinds: ["apiKey"],
    iconUrl:
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/png/home-assistant.png",
    category: [],
  },
} satisfies Record<
  string,
  {
    iconUrl: string;
    secretKinds: IntegrationSecretKind[];
    category: IntegrationCategory[];
  }
>;

export const getIconUrl = (integration: IntegrationKind) =>
  integrationDefs[integration]?.iconUrl ?? null;

export const getSecretKinds = (
  integration: IntegrationKind,
): IntegrationSecretKind[] => integrationDefs[integration]?.secretKinds ?? null;

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
