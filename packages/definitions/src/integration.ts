import type { AtLeastOneOf } from "@homarr/common/types";

import { createDocumentationLink } from "./docs";
import type { HomarrDocumentationPath } from "./docs/homarr-docs-sitemap";

type IntegrationDocumentationPath = Extract<HomarrDocumentationPath, `/docs/integrations/${string}`>;
type IntegrationDocumentationSlug = IntegrationDocumentationPath extends `/docs/integrations/${infer TSlug}`
  ? TSlug
  : never;

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
  patchmonApiKey: { isPublic: true, multiline: false },
  patchmonApiSecret: { isPublic: false, multiline: false },
  url: { isPublic: false, multiline: false },
  privateKey: { isPublic: false, multiline: true },
  githubAppId: { isPublic: true, multiline: false },
  githubInstallationId: { isPublic: true, multiline: false },
  slug: { isPublic: true, multiline: false },
} satisfies Record<string, { isPublic: boolean; multiline: boolean }>;

const isIntegrationSecretKind = (value: string): value is IntegrationSecretKind =>
  Object.hasOwn(integrationSecretKindObject, value);

export const integrationSecretKinds = Object.keys(integrationSecretKindObject).filter(isIntegrationSecretKind);

interface IntegrationFeatureMetadata {
  docker?: {
    aliases?: readonly string[];
    discoverable?: boolean;
  };
  onboarding?: {
    featuredOrder?: number;
    hidden?: boolean;
  };
}

interface IntegrationDefinition {
  name: string;
  iconUrl: string;
  secretKinds: readonly [readonly IntegrationSecretKind[], ...(readonly IntegrationSecretKind[])[]];
  category: readonly [IntegrationCategory, ...IntegrationCategory[]];
  documentationSlug: IntegrationDocumentationSlug | null;
  features?: IntegrationFeatureMetadata;
  defaultUrl?: string;
  defaultPort?: number;
  apiKeySettingsPath?: string;
  /** Server-owned authentication for arbitrary requests and native Stats requests. */
  httpAuth: IntegrationHttpAuthDefinition;
}

export type IntegrationHttpStandardAuth =
  | { type: "none" }
  | { type: "bearer"; secretKind?: IntegrationSecretKind }
  | { type: "apiKeyHeader"; name: string; prefix?: string; secretKind?: IntegrationSecretKind }
  | { type: "apiKeyQuery"; name: string; secretKind?: IntegrationSecretKind }
  | { type: "basic"; usernameKind?: IntegrationSecretKind; username?: string; passwordKind?: IntegrationSecretKind };

export type IntegrationHttpAuthDefinition =
  | IntegrationHttpStandardAuth
  | { type: "modes"; modes: readonly { when: readonly IntegrationSecretKind[]; auth: IntegrationHttpStandardAuth }[] }
  | { type: "adapter" };

export type IntegrationHttpBodyAuth =
  | { type: "jsonField"; name: string; value: string }
  | { type: "jsonArrayPrefix"; name: string; value: string };

export const integrationDefs = {
  autobrr: {
    httpAuth: { type: "apiKeyQuery", name: "apikey" },
    name: "Autobrr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/autobrr.svg",
    category: ["miscellaneous"],
    documentationSlug: "autobrr",
    defaultPort: 7474,
  },
  jellystat: {
    httpAuth: { type: "adapter" },
    name: "Jellystat",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/jellystat.svg",
    category: ["miscellaneous"],
    documentationSlug: "jellystat",
    defaultPort: 3000,
  },
  scrutiny: {
    httpAuth: { type: "adapter" },
    name: "Scrutiny",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/scrutiny.svg",
    category: ["miscellaneous"],
    documentationSlug: "scrutiny",
    defaultPort: 8080,
  },
  tubearchivist: {
    httpAuth: { type: "adapter" },
    name: "Tube Archivist",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/tube-archivist.png",
    category: ["miscellaneous"],
    documentationSlug: "tubearchivist",
    defaultPort: 8000,
  },
  frigate: {
    httpAuth: { type: "adapter" },
    name: "Frigate",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/frigate.svg",
    category: ["miscellaneous"],
    documentationSlug: "frigate",
    defaultPort: 5000,
  },
  komga: {
    httpAuth: { type: "apiKeyHeader", name: "X-API-Key" },
    name: "Komga",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/komga.svg",
    category: ["miscellaneous"],
    documentationSlug: "komga",
    defaultPort: 25600,
  },
  netalertx: {
    httpAuth: { type: "adapter" },
    name: "NetAlertX",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/netalertx.svg",
    category: ["miscellaneous"],
    documentationSlug: "netalertx",
    defaultPort: 20212,
  },
  jackett: {
    httpAuth: { type: "apiKeyQuery", name: "apikey" },
    name: "Jackett",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/jackett.svg",
    category: ["indexerManager"],
    documentationSlug: "jackett",
    defaultPort: 9117,
  },

  yourSpotify: {
    httpAuth: { type: "apiKeyQuery", name: "token" },
    name: "Your Spotify",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/your-spotify.svg",
    category: ["miscellaneous"],
    documentationSlug: "your-spotify",
    defaultPort: 8080,
  },

  romm: {
    httpAuth: { type: "adapter" },
    name: "RomM",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/romm.svg",
    category: ["miscellaneous"],
    documentationSlug: "romm",
    defaultPort: 8080,
  },

  homebox: {
    httpAuth: { type: "adapter" },
    name: "Homebox",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/homebox.svg",
    category: ["miscellaneous"],
    documentationSlug: "homebox",
    defaultPort: 7745,
  },

  mealie: {
    httpAuth: { type: "adapter" },
    name: "Mealie",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/mealie.svg",
    category: ["miscellaneous"],
    documentationSlug: "mealie",
    defaultPort: 9000,
  },

  xteve: {
    httpAuth: { type: "adapter" },
    name: "xTeVe",
    secretKinds: [[], ["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/xteve.png",
    category: ["miscellaneous"],
    documentationSlug: "xteve",
    defaultPort: 34400,
  },

  unmanic: {
    httpAuth: { type: "adapter" },
    name: "Unmanic",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/unmanic.png",
    category: ["miscellaneous"],
    documentationSlug: "unmanic",
    defaultPort: 8888,
  },

  syncthingRelay: {
    httpAuth: { type: "adapter" },
    name: "Syncthing Relay",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/syncthing.svg",
    category: ["miscellaneous"],
    documentationSlug: "syncthing-relay",
    defaultPort: 22070,
  },

  stash: {
    httpAuth: { type: "adapter" },
    name: "Stash",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/stash.svg",
    category: ["miscellaneous"],
    documentationSlug: "stash",
    defaultPort: 9999,
  },

  prometheus: {
    httpAuth: { type: "adapter" },
    name: "Prometheus",
    secretKinds: [[], ["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/prometheus.svg",
    category: ["miscellaneous"],
    documentationSlug: "prometheus",
    defaultPort: 9090,
  },

  plantit: {
    httpAuth: { type: "adapter" },
    name: "Plant-it",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/plant-it.png",
    category: ["miscellaneous"],
    documentationSlug: "plantit",
    defaultPort: 8080,
  },

  netdata: {
    httpAuth: { type: "adapter" },
    name: "Netdata",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/netdata.svg",
    category: ["miscellaneous"],
    documentationSlug: "netdata",
    defaultPort: 19999,
  },

  fileflows: {
    httpAuth: { type: "adapter" },
    name: "FileFlows",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/fileflows.svg",
    category: ["miscellaneous"],
    documentationSlug: "fileflows",
    defaultPort: 19200,
  },

  trilium: {
    httpAuth: { type: "apiKeyHeader", name: "Authorization" },
    name: "Trilium",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/trilium.svg",
    category: ["miscellaneous"],
    documentationSlug: "trilium",
    defaultPort: 8080,
  },

  tandoor: {
    httpAuth: { type: "adapter" },
    name: "Tandoor",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/tandoor-recipes.svg",
    category: ["miscellaneous"],
    documentationSlug: "tandoor",
    defaultPort: 8080,
  },

  spoolman: {
    httpAuth: { type: "adapter" },
    name: "Spoolman",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/spoolman.svg",
    category: ["miscellaneous"],
    documentationSlug: "spoolman",
    defaultPort: 7912,
  },

  miniflux: {
    httpAuth: { type: "adapter" },
    name: "Miniflux",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/miniflux.svg",
    category: ["miscellaneous"],
    documentationSlug: "miniflux",
    defaultPort: 8080,
  },

  maintainerr: {
    httpAuth: { type: "adapter" },
    name: "Maintainerr",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/maintainerr.svg",
    category: ["miscellaneous"],
    documentationSlug: "maintainerr",
    defaultPort: 6246,
  },

  linkwarden: {
    httpAuth: { type: "bearer" },
    name: "Linkwarden",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/linkwarden.png",
    category: ["miscellaneous"],
    documentationSlug: "linkwarden",
    defaultPort: 3000,
  },

  karakeep: {
    httpAuth: { type: "adapter" },
    name: "Karakeep",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/karakeep.svg",
    category: ["miscellaneous"],
    documentationSlug: "karakeep",
    defaultPort: 3000,
  },

  healthchecks: {
    httpAuth: { type: "adapter" },
    name: "Healthchecks",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/healthchecks.svg",
    category: ["miscellaneous"],
    documentationSlug: "healthchecks",
    defaultPort: 8000,
  },

  gatus: {
    httpAuth: { type: "adapter" },
    name: "Gatus",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/gatus.svg",
    category: ["miscellaneous"],
    documentationSlug: "gatus",
    defaultPort: 8080,
  },

  changedetection: {
    httpAuth: { type: "adapter" },
    name: "Changedetection.io",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/changedetection.svg",
    category: ["miscellaneous"],
    documentationSlug: "changedetection",
    defaultPort: 5000,
  },

  caddy: {
    httpAuth: { type: "adapter" },
    name: "Caddy",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/caddy.svg",
    category: ["miscellaneous"],
    documentationSlug: "caddy",
    defaultPort: 2019,
  },

  sabNzbd: {
    httpAuth: { type: "apiKeyQuery", name: "apikey" },
    name: "SABnzbd",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/sabnzbd.svg",
    category: ["downloadClient", "usenet"],
    documentationSlug: "sabnzbd",
    defaultPort: 8080,
    apiKeySettingsPath: "/config/general/",
    features: {
      docker: { aliases: ["sabnzbd"] },
      onboarding: { featuredOrder: 3 },
    },
  },
  nzbGet: {
    httpAuth: { type: "basic" },
    name: "NZBGet",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/nzbget.svg",
    category: ["downloadClient", "usenet"],
    documentationSlug: "nzbget",
    defaultPort: 6789,
    features: { docker: { aliases: ["nzbget"] } },
  },
  deluge: {
    httpAuth: { type: "adapter" },
    name: "Deluge",
    secretKinds: [["password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/deluge.svg",
    category: ["downloadClient", "torrent"],
    documentationSlug: "deluge",
    defaultPort: 8112,
  },
  transmission: {
    httpAuth: { type: "basic" },
    name: "Transmission",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/transmission.svg",
    category: ["downloadClient", "torrent"],
    documentationSlug: "transmission",
    defaultPort: 9091,
  },
  qBittorrent: {
    httpAuth: { type: "modes", modes: [{ when: ["apiKey"], auth: { type: "bearer" } }] },
    name: "qBittorrent",
    secretKinds: [["apiKey"], ["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/qbittorrent.svg",
    category: ["downloadClient", "torrent"],
    documentationSlug: "q-bittorent",
    defaultPort: 8080,
    apiKeySettingsPath: "/#/settings/webui",
    features: {
      docker: { aliases: ["qbittorrent"] },
      onboarding: { featuredOrder: 4 },
    },
  },
  aria2: {
    httpAuth: { type: "adapter" },
    name: "Aria2",
    secretKinds: [[], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/PapirusDevelopmentTeam/papirus_icons@latest/src/system_downloads_3.svg",
    category: ["downloadClient", "torrent", "miscellaneous"],
    documentationSlug: "aria2",
    defaultPort: 6800,
  },
  slskd: {
    httpAuth: { type: "adapter" },
    name: "Slskd",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/slskd.svg",
    category: ["downloadClient", "miscellaneous"],
    documentationSlug: "slskd",
    defaultPort: 5030,
  },
  sonarr: {
    httpAuth: { type: "adapter" },
    name: "Sonarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/sonarr.svg",
    category: ["calendar", "mediaOrganizer"],
    documentationSlug: "sonarr",
    defaultPort: 8989,
    apiKeySettingsPath: "/settings/general",
    features: { onboarding: { featuredOrder: 0 } },
  },
  radarr: {
    httpAuth: { type: "adapter" },
    name: "Radarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/radarr.svg",
    category: ["calendar", "mediaOrganizer"],
    documentationSlug: "radarr",
    defaultPort: 7878,
    apiKeySettingsPath: "/settings/general",
    features: { onboarding: { featuredOrder: 1 } },
  },
  lidarr: {
    httpAuth: { type: "adapter" },
    name: "Lidarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/lidarr.svg",
    category: ["calendar"],
    documentationSlug: "lidarr",
    defaultPort: 8686,
    apiKeySettingsPath: "/settings/general",
  },
  readarr: {
    httpAuth: { type: "adapter" },
    name: "Readarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@main/png/readarr.png",
    category: ["calendar"],
    documentationSlug: "readarr",
    defaultPort: 8787,
    apiKeySettingsPath: "/settings/general",
  },
  bindery: {
    httpAuth: { type: "apiKeyHeader", name: "X-Api-Key" },
    name: "Bindery",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/bindery.svg",
    category: ["mediaOrganizer"],
    documentationSlug: "bindery",
    defaultPort: 8787,
    apiKeySettingsPath: "/settings?tab=general",
  },
  prowlarr: {
    httpAuth: { type: "adapter" },
    name: "Prowlarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/prowlarr.svg",
    category: ["indexerManager"],
    documentationSlug: "prowlarr",
    defaultPort: 9696,
    apiKeySettingsPath: "/settings/general",
    features: { onboarding: { featuredOrder: 2 } },
  },
  bazarr: {
    httpAuth: { type: "apiKeyHeader", name: "X-API-KEY" },
    name: "Bazarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/bazarr.svg",
    category: ["subtitleManager"],
    documentationSlug: "bazarr",
    defaultPort: 6767,
    apiKeySettingsPath: "/settings/general",
    features: { docker: { aliases: ["bazarr"] } },
  },
  jellyfin: {
    httpAuth: { type: "adapter" },
    name: "Jellyfin",
    secretKinds: [["username", "password"], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/jellyfin.svg",
    category: ["mediaService", "mediaRelease"],
    documentationSlug: "jellyfin",
    defaultPort: 8096,
    apiKeySettingsPath: "/web/index.html#!/dashboard/keys",
    features: { onboarding: { featuredOrder: 6 } },
  },
  emby: {
    httpAuth: { type: "apiKeyHeader", name: "X-Emby-Token" },
    name: "Emby",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/emby.svg",
    category: ["mediaService", "mediaRelease"],
    documentationSlug: "emby",
    defaultPort: 8096,
  },
  plex: {
    httpAuth: { type: "apiKeyHeader", name: "X-Plex-Token" },
    name: "Plex",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/plex.svg",
    category: ["mediaService", "mediaRelease"],
    documentationSlug: "plex",
    defaultPort: 32400,
  },
  jellyseerr: {
    httpAuth: { type: "adapter" },
    name: "Jellyseerr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/jellyseerr.svg",
    category: ["mediaSearch", "mediaRequest", "search"],
    documentationSlug: "jellyseerr",
    defaultPort: 5055,
    apiKeySettingsPath: "/settings",
    features: { docker: { aliases: ["jellyseerr"] } },
  },
  seerr: {
    httpAuth: { type: "adapter" },
    name: "Seerr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/seerr.svg",
    category: ["mediaSearch", "mediaRequest", "search"],
    documentationSlug: "seerr",
    defaultPort: 5055,
    apiKeySettingsPath: "/settings",
    features: { onboarding: { featuredOrder: 5 } },
  },
  overseerr: {
    httpAuth: { type: "adapter" },
    name: "Overseerr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/overseerr.svg",
    category: ["mediaSearch", "mediaRequest", "search"],
    documentationSlug: "overseerr",
    defaultPort: 5055,
    apiKeySettingsPath: "/settings",
    features: { docker: { aliases: ["overseerr"] } },
  },
  piHole: {
    httpAuth: { type: "adapter" },
    name: "Pi-hole",
    secretKinds: [["apiKey"], []],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/pi-hole.svg",
    category: ["dnsHole"],
    documentationSlug: "pi-hole",
    defaultPort: 80,
    features: { docker: { aliases: ["pihole", "pi-hole"] } },
  },
  adGuardHome: {
    httpAuth: { type: "adapter" },
    name: "AdGuard Home",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/adguard-home.svg",
    category: ["dnsHole"],
    documentationSlug: "adguard-home",
    defaultPort: 3000,
    features: { docker: { aliases: ["adguardhome", "adguard-home", "adguard"] } },
  },
  technitiumDns: {
    httpAuth: { type: "adapter" },
    name: "Technitium DNS",
    secretKinds: [["apiKey"], ["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/technitium.svg",
    category: ["dnsHole"],
    documentationSlug: "technitium-dns",
    defaultPort: 5380,
  },
  homeAssistant: {
    httpAuth: { type: "adapter" },
    name: "Home Assistant",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/home-assistant.svg",
    category: ["smartHomeServer", "calendar"],
    documentationSlug: "home-assistant",
    defaultPort: 8123,
    apiKeySettingsPath: "/profile/security",
    features: { docker: { aliases: ["homeassistant", "home-assistant", "hass"] } },
  },
  openmediavault: {
    httpAuth: { type: "adapter" },
    name: "OpenMediaVault",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/openmediavault.svg",
    category: ["healthMonitoring"],
    documentationSlug: "open-media-vault",
    defaultPort: 80,
    features: { docker: { aliases: ["omv"] } },
  },
  dashDot: {
    httpAuth: { type: "none" },
    name: "Dash.",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/dashdot.png",
    category: ["healthMonitoring"],
    documentationSlug: "dash-dot",
    defaultPort: 3001,
    features: { docker: { aliases: ["dashdot", "dash-dot", "dash."] } },
  },
  glances: {
    httpAuth: { type: "none" },
    name: "Glances",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/glances.svg",
    category: ["healthMonitoring"],
    documentationSlug: "glances",
    defaultPort: 61208,
  },
  tdarr: {
    httpAuth: {
      type: "modes",
      modes: [
        { when: [], auth: { type: "none" } },
        { when: ["apiKey"], auth: { type: "apiKeyHeader", name: "X-Api-Key" } },
      ],
    },
    name: "Tdarr",
    secretKinds: [[], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/tdarr.png",
    category: ["mediaTranscoding"],
    documentationSlug: "tdarr",
    defaultPort: 8265,
  },
  proxmox: {
    httpAuth: { type: "adapter" },
    name: "Proxmox",
    secretKinds: [["username", "tokenId", "apiKey", "realm"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/proxmox.svg",
    category: ["healthMonitoring"],
    documentationSlug: "proxmox",
    defaultPort: 8006,
  },
  nextcloud: {
    httpAuth: { type: "adapter" },
    name: "Nextcloud",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/nextcloud.svg",
    category: ["calendar", "notifications"],
    documentationSlug: "nextcloud",
    defaultPort: 443,
  },
  unifiController: {
    httpAuth: { type: "adapter" },
    name: "Unifi Controller",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/unifi.png",
    category: ["networkController"],
    documentationSlug: "unifi-controller",
    defaultPort: 8443,
    features: { docker: { aliases: ["unifi", "unifi-controller"] } },
  },
  opnsense: {
    httpAuth: { type: "basic", usernameKind: "opnsenseApiKey", passwordKind: "opnsenseApiSecret" },
    name: "OPNsense",
    secretKinds: [["opnsenseApiKey", "opnsenseApiSecret"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/opnsense.svg",
    category: ["firewall"],
    documentationSlug: "opnsense",
    defaultPort: 443,
    apiKeySettingsPath: "/system_usermanager.php",
  },
  ntfy: {
    httpAuth: {
      type: "modes",
      modes: [
        { when: ["topic"], auth: { type: "none" } },
        { when: ["topic", "apiKey"], auth: { type: "bearer" } },
      ],
    },
    name: "ntfy",
    secretKinds: [["topic"], ["topic", "apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/ntfy.svg",
    category: ["notifications"],
    documentationSlug: "ntfy",
    defaultPort: 80,
    apiKeySettingsPath: "/account",
  },
  gotify: {
    httpAuth: { type: "basic" },
    name: "Gotify",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/gotify.svg",
    category: ["notifications"],
    documentationSlug: "gotify",
    defaultPort: 80,
  },
  ical: {
    httpAuth: { type: "adapter" },
    name: "iCal",
    secretKinds: [["url"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/ical.svg",
    category: ["calendar"],
    documentationSlug: "ical",
    features: { docker: { discoverable: false } },
  },
  anchor: {
    httpAuth: { type: "bearer" },
    name: "Anchor",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/anchor.svg",
    category: ["notes"],
    documentationSlug: "anchor",
    defaultPort: 8080,
    apiKeySettingsPath: "/settings",
  },
  truenas: {
    httpAuth: { type: "adapter" },
    name: "TrueNAS",
    secretKinds: [["username", "password"], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/truenas.svg",
    category: ["healthMonitoring"],
    documentationSlug: "truenas",
    defaultPort: 80,
    features: { docker: { aliases: ["truenas"] } },
  },
  synology: {
    httpAuth: { type: "adapter" },
    name: "Synology DiskStation",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/synology.svg",
    category: ["healthMonitoring"],
    documentationSlug: "synology",
    defaultPort: 5000,
    features: { docker: { aliases: ["synology", "diskstation"] } },
  },
  unraid: {
    httpAuth: { type: "apiKeyHeader", name: "x-api-key" },
    name: "Unraid",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/unraid.svg",
    category: ["healthMonitoring"],
    documentationSlug: "unraid",
    defaultPort: 80,
    apiKeySettingsPath: "/Settings/ManagementAccess",
  },
  coolify: {
    httpAuth: { type: "adapter" },
    name: "Coolify",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/coolify.svg",
    category: ["healthMonitoring"],
    documentationSlug: "coolify",
    defaultPort: 8000,
    apiKeySettingsPath: "/security/api-tokens",
    features: { docker: { aliases: ["coolify"] } },
  },
  immich: {
    httpAuth: { type: "adapter" },
    name: "Immich",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/immich.svg",
    category: ["photoService"],
    documentationSlug: "immich",
    defaultPort: 2283,
    apiKeySettingsPath: "/user-settings",
  },
  paperlessNgx: {
    httpAuth: { type: "apiKeyHeader", name: "Authorization", prefix: "Token " },
    name: "Paperless-ngx",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/paperless-ngx.svg",
    category: ["documents"],
    documentationSlug: "paperless-ngx",
    defaultPort: 8000,
    features: { docker: { aliases: ["paperless-ngx", "paperless"] } },
  },
  patchmon: {
    httpAuth: { type: "basic", usernameKind: "patchmonApiKey", passwordKind: "patchmonApiSecret" },
    name: "PatchMon",
    secretKinds: [["patchmonApiKey", "patchmonApiSecret"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/patchmon.svg",
    category: ["healthMonitoring"],
    documentationSlug: "patchmon",
    defaultPort: 3413,
    apiKeySettingsPath: "/settings/integrations",
    features: { docker: { aliases: ["patchmon", "patch-mon"] } },
  },
  tracearr: {
    httpAuth: { type: "bearer" },
    name: "Tracearr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/tracearr.svg",
    category: ["mediaMonitoring"],
    documentationSlug: "tracearr",
    defaultPort: 7040,
    apiKeySettingsPath: "/settings",
  },
  speedtestTracker: {
    httpAuth: { type: "adapter" },
    name: "Speedtest Tracker",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/speedtest-tracker.png",
    category: ["speedtest"],
    documentationSlug: "speedtest-tracker",
    defaultPort: 80,
    apiKeySettingsPath: "/admin/api-tokens",
    features: { docker: { aliases: ["speedtest-tracker"] } },
  },
  uptimeKuma: {
    httpAuth: {
      type: "modes",
      modes: [
        { when: [], auth: { type: "none" } },
        { when: ["slug"], auth: { type: "none" } },
        { when: ["apiKey"], auth: { type: "basic", username: "", passwordKind: "apiKey" } },
        { when: ["slug", "apiKey"], auth: { type: "basic", username: "", passwordKind: "apiKey" } },
      ],
    },
    name: "Uptime Kuma",
    secretKinds: [[], ["slug"], ["slug", "apiKey"], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/uptime-kuma.svg",
    category: ["uptimeMonitoring"],
    documentationSlug: "uptime-kuma",
    defaultPort: 3001,
    apiKeySettingsPath: "/settings/api-keys",
    features: { docker: { aliases: ["uptime-kuma"] } },
  },
  audiobookshelf: {
    httpAuth: { type: "adapter" },
    name: "Audiobookshelf",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/audiobookshelf.svg",
    category: ["mediaLibrary"],
    documentationSlug: "audiobookshelf",
    defaultPort: 13378,
    apiKeySettingsPath: "/account",
    features: { docker: { aliases: ["audiobookshelf"] } },
  },
  navidrome: {
    httpAuth: { type: "adapter" },
    name: "Navidrome",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/navidrome.svg",
    category: ["mediaLibrary", "mediaService"],
    documentationSlug: "navidrome",
    defaultPort: 4533,
    features: { docker: { aliases: ["navidrome"] } },
  },
  umami: {
    httpAuth: { type: "adapter" },
    name: "Umami",
    secretKinds: [["username", "password"], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/umami.svg",
    category: ["analytics"],
    defaultUrl: "https://api.umami.is/v1",
    documentationSlug: "umami",
    defaultPort: 3000,
  },
  peaNut: {
    httpAuth: {
      type: "modes",
      modes: [
        { when: [], auth: { type: "none" } },
        { when: ["username", "password"], auth: { type: "basic" } },
      ],
    },
    name: "PeaNUT",
    secretKinds: [["username", "password"], []],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/peanut.svg",
    category: ["ups"],
    documentationSlug: "peanut",
    defaultPort: 8080,
  },
  beszel: {
    httpAuth: { type: "adapter" },
    name: "Beszel",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/beszel.svg",
    category: ["beszel"],
    documentationSlug: "beszel",
    defaultPort: 8090,
  },
  gluetun: {
    httpAuth: {
      type: "modes",
      modes: [
        { when: [], auth: { type: "none" } },
        { when: ["apiKey"], auth: { type: "apiKeyHeader", name: "X-API-Key" } },
        { when: ["username", "password"], auth: { type: "basic" } },
      ],
    },
    name: "Gluetun",
    secretKinds: [["username", "password"], ["apiKey"], []],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/gluetun.svg",
    category: ["vpn"],
    documentationSlug: "gluetun",
    defaultPort: 8000,
  },
  traefik: {
    httpAuth: {
      type: "modes",
      modes: [
        { when: [], auth: { type: "none" } },
        { when: ["apiKey"], auth: { type: "bearer" } },
        { when: ["username", "password"], auth: { type: "basic" } },
      ],
    },
    name: "Traefik",
    secretKinds: [[], ["username", "password"], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/traefik.svg",
    category: ["reverseProxy"],
    documentationSlug: "traefik",
    defaultPort: 8080,
  },
  archiveTeamWarrior: {
    httpAuth: {
      type: "modes",
      modes: [
        { when: [], auth: { type: "none" } },
        { when: ["username", "password"], auth: { type: "basic" } },
      ],
    },
    name: "ArchiveTeam Warrior",
    secretKinds: [[], ["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/png/archiveteam-warrior.png",
    category: ["archiving"],
    documentationSlug: "archiveteam-warrior",
    defaultPort: 8001,
  },
  wud: {
    httpAuth: {
      type: "modes",
      modes: [
        { when: [], auth: { type: "none" } },
        { when: ["username", "password"], auth: { type: "basic" } },
      ],
    },
    name: "What's Up Docker",
    secretKinds: [[], ["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/whats-up-docker.svg",
    category: ["healthMonitoring"],
    documentationSlug: "whats-up-docker",
    defaultPort: 3000,
  },
  llamacpp: {
    httpAuth: { type: "none" },
    name: "llama.cpp",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/llama-cpp.svg",
    category: ["systemMonitoring"],
    documentationSlug: "llama-cpp",
    defaultPort: 8080,
  },
  // This integration only returns mock data, it is used during development (but can also be used in production by directly going to the create page)
  mock: {
    httpAuth: { type: "none" },
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
      "mediaOrganizer",
    ],
    documentationSlug: null,
    features: {
      docker: { discoverable: false },
      onboarding: { hidden: true },
    },
  },
} as const satisfies Record<string, IntegrationDefinition>;

const isIntegrationKind = (value: string): value is IntegrationKind => Object.hasOwn(integrationDefs, value);
const integrationKindValues = Object.keys(integrationDefs).filter(isIntegrationKind);
const firstIntegrationKind = integrationKindValues[0];
if (!firstIntegrationKind) throw new Error("At least one integration definition is required");

export const integrationKinds: AtLeastOneOf<IntegrationKind> = [
  firstIntegrationKind,
  ...integrationKindValues.slice(1),
];

export const getIconUrl = (integration: IntegrationKind) => integrationDefs[integration].iconUrl;

export const getIntegrationName = (integration: IntegrationKind) => integrationDefs[integration].name;

export const getDefaultSecretKinds = (integration: IntegrationKind): IntegrationSecretKind[] => [
  ...integrationDefs[integration].secretKinds[0],
];

export const getAllSecretKindOptions = (integration: IntegrationKind): AtLeastOneOf<IntegrationSecretKind[]> => {
  const [first, ...rest] = integrationDefs[integration].secretKinds;
  return [[...first], ...rest.map((secretKinds) => [...secretKinds])];
};

export const getIntegrationDefaultUrl = (integration: IntegrationKind) => {
  const definition = integrationDefs[integration];
  return "defaultUrl" in definition ? definition.defaultUrl : undefined;
};

export const getIntegrationDefaultPort = (kind: IntegrationKind): number | undefined => {
  const definition = integrationDefs[kind];
  return "defaultPort" in definition ? definition.defaultPort : undefined;
};

export const getIntegrationDocumentationSlug = (kind: IntegrationKind): IntegrationDocumentationSlug | null =>
  integrationDefs[kind].documentationSlug;

export const getIntegrationDocumentationUrl = (kind: IntegrationKind): string | null => {
  const slug = getIntegrationDocumentationSlug(kind);
  if (slug === null) return null;
  return createDocumentationLink(`/docs/integrations/${slug}`);
};

export const getIntegrationDockerMetadata = (kind: IntegrationKind) => {
  const definition: IntegrationDefinition = integrationDefs[kind];
  return {
    aliases: definition.features?.docker?.aliases ?? [],
    discoverable: definition.features?.docker?.discoverable ?? true,
  };
};

export const getIntegrationOnboardingMetadata = (kind: IntegrationKind) => {
  const definition: IntegrationDefinition = integrationDefs[kind];
  return {
    featuredOrder: definition.features?.onboarding?.featuredOrder ?? null,
    hidden: definition.features?.onboarding?.hidden ?? false,
  };
};

export const getIntegrationApiKeyUrl = (integrationUrl: string, kind: IntegrationKind): string | null => {
  const definition = integrationDefs[kind];
  if (!("apiKeySettingsPath" in definition)) return null;
  try {
    const value = integrationUrl.trim();
    if (!value) return null;
    const base = new URL(/^[a-z][a-z0-9+.-]*:\/\//iu.test(value) ? value : `http://${value}`);
    if (base.protocol !== "http:" && base.protocol !== "https:") return null;
    const settings = new URL(definition.apiKeySettingsPath, "http://localhost");
    base.pathname = `${base.pathname.replace(/\/+$/, "")}/${settings.pathname.replace(/^\/+/, "")}`;
    base.search = settings.search;
    base.hash = settings.hash;
    return base.toString();
  } catch {
    return null;
  }
};

/**
 * Get all integration kinds that share a category, typed only by the kinds belonging to the category
 * @param category Category to filter by, belonging to IntegrationCategory
 * @returns Partial list of integration kinds
 */
export const getIntegrationKindsByCategory = <TCategory extends IntegrationCategory>(category: TCategory) => {
  const matchesCategory = (integration: IntegrationKind): integration is IntegrationKindByCategory<TCategory> =>
    integrationDefs[integration].category.some((definitionCategory) => definitionCategory === category);
  const matches = integrationKinds.filter(matchesCategory);
  const firstMatch = matches[0];
  if (!firstMatch) throw new Error(`No integration definition uses the ${category} category`);
  return [firstMatch, ...matches.slice(1)] satisfies AtLeastOneOf<IntegrationKindByCategory<TCategory>>;
};

/**
 * Directly get the types of the list returned by getIntegrationKindsByCategory
 */
export type IntegrationKindByCategory<TCategory extends IntegrationCategory> = {
  [Key in keyof typeof integrationDefs]: TCategory extends (typeof integrationDefs)[Key]["category"][number]
    ? Key
    : never;
}[keyof typeof integrationDefs] &
  IntegrationKind;

export type IntegrationSecretKind = keyof typeof integrationSecretKindObject;
export type IntegrationKind = keyof typeof integrationDefs;

export const integrationCategories = [
  "dnsHole",
  "mediaService",
  "calendar",
  "mediaOrganizer",
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
  "beszel",
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
  "systemMonitoring",
] as const;

export type IntegrationCategory = (typeof integrationCategories)[number];

/** These integrations have no arbitrary HTTP API that can reuse their saved connection. */
export const integrationHttpUnavailableReasons = {
  ical: "iCalendar feeds use a saved calendar URL, not an arbitrary service API",
  truenas: "TrueNAS uses a WebSocket API; generic integration requests support HTTP only",
} as const satisfies Partial<Record<IntegrationKind, string>>;

export type HttpIntegrationKind = Exclude<IntegrationKind, keyof typeof integrationHttpUnavailableReasons>;

export function isHttpIntegrationKind(kind: string): kind is HttpIntegrationKind {
  return isIntegrationKind(kind) && !Object.hasOwn(integrationHttpUnavailableReasons, kind);
}

export function getIntegrationHttpUnavailableReason(kind: IntegrationKind): string | undefined {
  const reasons: Partial<Record<IntegrationKind, string>> = integrationHttpUnavailableReasons;
  return reasons[kind];
}

export function getIntegrationHttpAuthDefinition(kind: IntegrationKind): IntegrationHttpAuthDefinition {
  return integrationDefs[kind].httpAuth;
}

const httpIntegrationKindValues = integrationKinds.filter(isHttpIntegrationKind);
const firstHttpIntegrationKind = httpIntegrationKindValues[0];
if (!firstHttpIntegrationKind) throw new Error("At least one HTTP integration definition is required");

export const httpIntegrationKinds: AtLeastOneOf<HttpIntegrationKind> = [
  firstHttpIntegrationKind,
  ...httpIntegrationKindValues.slice(1),
];
