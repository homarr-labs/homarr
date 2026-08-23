import { objectEntries, objectKeys } from "@homarr/common";
import type { AtLeastOneOf } from "@homarr/common/types";

import { createDocumentationLink } from "./docs";
import type { HomarrDocumentationPath } from "./docs/homarr-docs-sitemap";
import { generatedIntegrationDefinitions } from "./generated/integration-modules";

type IntegrationDocumentationPath = Extract<HomarrDocumentationPath, `/docs/integrations/${string}`>;
type IntegrationDocumentationSlug = string;

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

export const integrationSecretKinds = objectKeys(integrationSecretKindObject);

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

interface ResolvedIntegrationFeatureMetadata {
  docker: {
    aliases: readonly string[];
    discoverable: boolean;
  };
  onboarding: {
    featuredOrder: number | null;
    hidden: boolean;
  };
}

interface integrationDefinition {
  name: string;
  iconUrl: string;
  secretKinds: readonly [readonly IntegrationSecretKind[], ...(readonly IntegrationSecretKind[])[]];
  category: readonly [IntegrationCategory, ...IntegrationCategory[]];
  documentationSlug: IntegrationDocumentationSlug | null;
  features?: IntegrationFeatureMetadata;
  defaultUrl?: string;
  defaultPort?: number;
  apiKeySettingsPath?: string;
}

type ResolvedIntegrationDefinitions<TDefinitions extends Record<string, integrationDefinition>> = {
  [TKind in keyof TDefinitions]: TDefinitions[TKind] & {
    documentationUrl: string | null;
    features: ResolvedIntegrationFeatureMetadata;
  };
};

const createIntegrationDefinitions = <const TDefinitions extends Record<string, integrationDefinition>>(
  definitions: TDefinitions,
): ResolvedIntegrationDefinitions<TDefinitions> => {
  return Object.fromEntries(
    objectEntries(definitions).map(([kind, definition]) => {
      let documentationUrl: string | null = null;
      if (definition.documentationSlug !== null) {
        const documentationPath = `/docs/integrations/${definition.documentationSlug}` as IntegrationDocumentationPath;
        documentationUrl = createDocumentationLink(documentationPath);
      }
      return [
        kind,
        {
          ...definition,
          documentationUrl,
          features: {
            docker: {
              aliases: definition.features?.docker?.aliases ?? [],
              discoverable: definition.features?.docker?.discoverable ?? true,
            },
            onboarding: {
              featuredOrder: definition.features?.onboarding?.featuredOrder ?? null,
              hidden: definition.features?.onboarding?.hidden ?? false,
            },
          },
        },
      ];
    }),
  ) as unknown as ResolvedIntegrationDefinitions<TDefinitions>;
};

export const integrationDefs = createIntegrationDefinitions({
  sabNzbd: {
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
    name: "NZBGet",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/nzbget.svg",
    category: ["downloadClient", "usenet"],
    documentationSlug: "nzbget",
    defaultPort: 6789,
    features: { docker: { aliases: ["nzbget"] } },
  },
  deluge: {
    name: "Deluge",
    secretKinds: [["password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/deluge.svg",
    category: ["downloadClient", "torrent"],
    documentationSlug: "deluge",
    defaultPort: 8112,
  },
  transmission: {
    name: "Transmission",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/transmission.svg",
    category: ["downloadClient", "torrent"],
    documentationSlug: "transmission",
    defaultPort: 9091,
  },
  qBittorrent: {
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
    name: "Aria2",
    secretKinds: [[], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/PapirusDevelopmentTeam/papirus_icons@latest/src/system_downloads_3.svg",
    category: ["downloadClient", "torrent", "miscellaneous"],
    documentationSlug: "aria2",
    defaultPort: 6800,
  },
  slskd: {
    name: "Slskd",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/slskd.svg",
    category: ["downloadClient", "miscellaneous"],
    documentationSlug: "slskd",
    defaultPort: 5030,
  },
  sonarr: {
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
    name: "Lidarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/lidarr.svg",
    category: ["calendar"],
    documentationSlug: "lidarr",
    defaultPort: 8686,
    apiKeySettingsPath: "/settings/general",
  },
  readarr: {
    name: "Readarr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@main/png/readarr.png",
    category: ["calendar"],
    documentationSlug: "readarr",
    defaultPort: 8787,
    apiKeySettingsPath: "/settings/general",
  },
  prowlarr: {
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
    name: "Emby",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/emby.svg",
    category: ["mediaService", "mediaRelease"],
    documentationSlug: "emby",
    defaultPort: 8096,
  },
  plex: {
    name: "Plex",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/plex.svg",
    category: ["mediaService", "mediaRelease"],
    documentationSlug: "plex",
    defaultPort: 32400,
  },
  jellyseerr: {
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
    name: "Pi-hole",
    secretKinds: [["apiKey"], []],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/pi-hole.svg",
    category: ["dnsHole"],
    documentationSlug: "pi-hole",
    defaultPort: 80,
    features: { docker: { aliases: ["pihole", "pi-hole"] } },
  },
  adGuardHome: {
    name: "AdGuard Home",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/adguard-home.svg",
    category: ["dnsHole"],
    documentationSlug: "adguard-home",
    defaultPort: 3000,
    features: { docker: { aliases: ["adguardhome", "adguard-home", "adguard"] } },
  },
  technitiumDns: {
    name: "Technitium DNS",
    secretKinds: [["apiKey"], ["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/svg/technitium.svg",
    category: ["dnsHole"],
    documentationSlug: "technitium-dns",
    defaultPort: 5380,
  },
  homeAssistant: {
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
    name: "OpenMediaVault",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/openmediavault.svg",
    category: ["healthMonitoring"],
    documentationSlug: "open-media-vault",
    defaultPort: 80,
    features: { docker: { aliases: ["omv"] } },
  },
  dashDot: {
    name: "Dash.",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/dashdot.png",
    category: ["healthMonitoring"],
    documentationSlug: "dash-dot",
    defaultPort: 3001,
    features: { docker: { aliases: ["dashdot", "dash-dot", "dash."] } },
  },
  glances: {
    name: "Glances",
    secretKinds: [[]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/glances.svg",
    category: ["healthMonitoring"],
    documentationSlug: "glances",
    defaultPort: 61208,
  },
  tdarr: {
    name: "Tdarr",
    secretKinds: [[], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/tdarr.png",
    category: ["mediaTranscoding"],
    documentationSlug: "tdarr",
    defaultPort: 8265,
  },
  proxmox: {
    name: "Proxmox",
    secretKinds: [["username", "tokenId", "apiKey", "realm"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/proxmox.svg",
    category: ["healthMonitoring"],
    documentationSlug: "proxmox",
    defaultPort: 8006,
  },
  nextcloud: {
    name: "Nextcloud",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/nextcloud.svg",
    category: ["calendar", "notifications"],
    documentationSlug: "nextcloud",
    defaultPort: 443,
  },
  unifiController: {
    name: "Unifi Controller",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/png/unifi.png",
    category: ["networkController"],
    documentationSlug: "unifi-controller",
    defaultPort: 8443,
    features: { docker: { aliases: ["unifi", "unifi-controller"] } },
  },
  opnsense: {
    name: "OPNsense",
    secretKinds: [["opnsenseApiKey", "opnsenseApiSecret"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/opnsense.svg",
    category: ["firewall"],
    documentationSlug: "opnsense",
    defaultPort: 443,
    apiKeySettingsPath: "/system_usermanager.php",
  },
  ntfy: {
    name: "ntfy",
    secretKinds: [["topic"], ["topic", "apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/ntfy.svg",
    category: ["notifications"],
    documentationSlug: "ntfy",
    defaultPort: 80,
    apiKeySettingsPath: "/account",
  },
  gotify: {
    name: "Gotify",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/gotify.svg",
    category: ["notifications"],
    documentationSlug: "gotify",
    defaultPort: 80,
  },
  ical: {
    name: "iCal",
    secretKinds: [["url"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/ical.svg",
    category: ["calendar"],
    documentationSlug: "ical",
    features: { docker: { discoverable: false } },
  },
  anchor: {
    name: "Anchor",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/anchor.svg",
    category: ["notes"],
    documentationSlug: "anchor",
    defaultPort: 8080,
    apiKeySettingsPath: "/settings",
  },
  truenas: {
    name: "TrueNAS",
    secretKinds: [["username", "password"], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/truenas.svg",
    category: ["healthMonitoring"],
    documentationSlug: "truenas",
    defaultPort: 80,
    features: { docker: { aliases: ["truenas"] } },
  },
  synology: {
    name: "Synology DiskStation",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/synology.svg",
    category: ["healthMonitoring"],
    documentationSlug: "synology",
    defaultPort: 5000,
    features: { docker: { aliases: ["synology", "diskstation"] } },
  },
  unraid: {
    name: "Unraid",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/unraid.svg",
    category: ["healthMonitoring"],
    documentationSlug: "unraid",
    defaultPort: 80,
    apiKeySettingsPath: "/Settings/ManagementAccess",
  },
  coolify: {
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
    name: "Immich",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/immich.svg",
    category: ["photoService"],
    documentationSlug: "immich",
    defaultPort: 2283,
    apiKeySettingsPath: "/user-settings",
  },
  paperlessNgx: {
    name: "Paperless-ngx",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/paperless-ngx.svg",
    category: ["documents"],
    documentationSlug: "paperless-ngx",
    defaultPort: 8000,
    features: { docker: { aliases: ["paperless-ngx", "paperless"] } },
  },
  patchmon: {
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
    name: "Tracearr",
    secretKinds: [["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/tracearr.svg",
    category: ["mediaMonitoring"],
    documentationSlug: "tracearr",
    defaultPort: 7040,
    apiKeySettingsPath: "/settings",
  },
  speedtestTracker: {
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
    name: "Navidrome",
    secretKinds: [["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/navidrome.svg",
    category: ["mediaLibrary", "mediaService"],
    documentationSlug: "navidrome",
    defaultPort: 4533,
    features: { docker: { aliases: ["navidrome"] } },
  },
  umami: {
    name: "Umami",
    secretKinds: [["username", "password"], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/umami.svg",
    category: ["analytics"],
    defaultUrl: "https://api.umami.is/v1",
    documentationSlug: "umami",
    defaultPort: 3000,
  },
  peaNut: {
    name: "PeaNUT",
    secretKinds: [["username", "password"], []],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/peanut.svg",
    category: ["ups"],
    documentationSlug: "peanut",
    defaultPort: 8080,
  },
  ...generatedIntegrationDefinitions,
  gluetun: {
    name: "Gluetun",
    secretKinds: [["username", "password"], ["apiKey"], []],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/gluetun.svg",
    category: ["vpn"],
    documentationSlug: "gluetun",
    defaultPort: 8000,
  },
  traefik: {
    name: "Traefik",
    secretKinds: [[], ["username", "password"], ["apiKey"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/traefik.svg",
    category: ["reverseProxy"],
    documentationSlug: "traefik",
    defaultPort: 8080,
  },
  archiveTeamWarrior: {
    name: "ArchiveTeam Warrior",
    secretKinds: [[], ["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/selfhst/icons/png/archiveteam-warrior.png",
    category: ["archiving"],
    documentationSlug: "archiveteam-warrior",
    defaultPort: 8001,
  },
  wud: {
    name: "What's Up Docker",
    secretKinds: [[], ["username", "password"]],
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/whats-up-docker.svg",
    category: ["healthMonitoring"],
    documentationSlug: "whats-up-docker",
    defaultPort: 3000,
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
      "mediaOrganizer",
    ],
    documentationSlug: null,
    features: {
      docker: { discoverable: false },
      onboarding: { hidden: true },
    },
  },
} as const satisfies Record<string, integrationDefinition>);

export const integrationKinds = objectKeys(integrationDefs) as AtLeastOneOf<IntegrationKind>;

export const getIconUrl = (integration: IntegrationKind) => integrationDefs[integration].iconUrl;

export const getIntegrationName = (integration: IntegrationKind) => integrationDefs[integration].name;

export const getDefaultSecretKinds = (integration: IntegrationKind): IntegrationSecretKind[] => [
  ...integrationDefs[integration].secretKinds[0],
];

export const getAllSecretKindOptions = (integration: IntegrationKind): AtLeastOneOf<IntegrationSecretKind[]> =>
  integrationDefs[integration].secretKinds.map((secretKinds) => [...secretKinds]) as AtLeastOneOf<
    IntegrationSecretKind[]
  >;

export const getIntegrationDefaultUrl = (integration: IntegrationKind) => {
  const definition = integrationDefs[integration];
  return "defaultUrl" in definition ? definition.defaultUrl : undefined;
};

export const getIntegrationDefaultPort = (kind: IntegrationKind): number | undefined => {
  const definition = integrationDefs[kind];
  return "defaultPort" in definition ? definition.defaultPort : undefined;
};

export const getIntegrationDocumentationUrl = (kind: IntegrationKind): string | null =>
  integrationDefs[kind].documentationUrl;

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
] as const;

export type IntegrationCategory = (typeof integrationCategories)[number];
