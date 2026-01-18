import type { IntegrationKind } from "@homarr/definitions";

import type { Integration, IntegrationInput } from "./integration";

export const createIntegrationAsync = async <TKind extends keyof typeof integrationCreators>(
  integration: IntegrationInput & { kind: TKind },
) => {
  if (!(integration.kind in integrationCreators)) {
    throw new Error(
      `Unknown integration kind ${integration.kind}. Did you forget to add it to the integration creator?`,
    );
  }

  const importCreator = integrationCreators[integration.kind];
  const creator = await importCreator();

  // factories are an array, to differentiate in js between class constructors and functions
  if (Array.isArray(creator)) {
    return (await creator[0](integration)) as IntegrationInstanceOfKind<TKind>;
  }

  return new creator(integration) as IntegrationInstanceOfKind<TKind>;
};

type IntegrationInstance = new (integration: IntegrationInput) => Integration;

// factories are an array, to differentiate in js between class constructors and functions
export const integrationCreators = {
  piHole: () =>
    import("../pi-hole/pi-hole-integration-factory").then((module) => [module.createPiHoleIntegrationAsync]),
  adGuardHome: () => import("../adguard-home/adguard-home-integration").then((module) => module.AdGuardHomeIntegration),
  homeAssistant: () =>
    import("../homeassistant/homeassistant-integration").then((module) => module.HomeAssistantIntegration),
  jellyfin: () => import("../jellyfin/jellyfin-integration").then((module) => module.JellyfinIntegration),
  plex: () => import("../plex/plex-integration").then((module) => module.PlexIntegration),
  sonarr: () => import("../media-organizer/sonarr/sonarr-integration").then((module) => module.SonarrIntegration),
  radarr: () => import("../media-organizer/radarr/radarr-integration").then((module) => module.RadarrIntegration),
  sabNzbd: () => import("../download-client/sabnzbd/sabnzbd-integration").then((module) => module.SabnzbdIntegration),
  nzbGet: () => import("../download-client/nzbget/nzbget-integration").then((module) => module.NzbGetIntegration),
  qBittorrent: () =>
    import("../download-client/qbittorrent/qbittorrent-integration").then((module) => module.QBitTorrentIntegration),
  deluge: () => import("../download-client/deluge/deluge-integration").then((module) => module.DelugeIntegration),
  transmission: () =>
    import("../download-client/transmission/transmission-integration").then((module) => module.TransmissionIntegration),
  aria2: () => import("../download-client/aria2/aria2-integration").then((module) => module.Aria2Integration),
  jellyseerr: () => import("../jellyseerr/jellyseerr-integration").then((module) => module.JellyseerrIntegration),
  overseerr: () => import("../overseerr/overseerr-integration").then((module) => module.OverseerrIntegration),
  prowlarr: () => import("../prowlarr/prowlarr-integration").then((module) => module.ProwlarrIntegration),
  openmediavault: () =>
    import("../openmediavault/openmediavault-integration").then((module) => module.OpenMediaVaultIntegration),
  lidarr: () => import("../media-organizer/lidarr/lidarr-integration").then((module) => module.LidarrIntegration),
  readarr: () => import("../media-organizer/readarr/readarr-integration").then((module) => module.ReadarrIntegration),
  dashDot: () => import("../dashdot/dashdot-integration").then((module) => module.DashDotIntegration),
  tdarr: () => import("../media-transcoding/tdarr-integration").then((module) => module.TdarrIntegration),
  proxmox: () => import("../proxmox/proxmox-integration").then((module) => module.ProxmoxIntegration),
  emby: () => import("../emby/emby-integration").then((module) => module.EmbyIntegration),
  nextcloud: () => import("../nextcloud/nextcloud.integration").then((module) => module.NextcloudIntegration),
  unifiController: () =>
    import("../unifi-controller/unifi-controller-integration").then((module) => module.UnifiControllerIntegration),
  opnsense: () => import("../opnsense/opnsense-integration").then((module) => module.OPNsenseIntegration),
  github: () => import("../github/github-integration").then((module) => module.GithubIntegration),
  dockerHub: () => import("../docker-hub/docker-hub-integration").then((module) => module.DockerHubIntegration),
  gitlab: () => import("../gitlab/gitlab-integration").then((module) => module.GitlabIntegration),
  npm: () => import("../npm/npm-integration").then((module) => module.NPMIntegration),
  codeberg: () => import("../codeberg/codeberg-integration").then((module) => module.CodebergIntegration),
  linuxServerIO: () =>
    import("../linuxserverio/linuxserverio-integration").then((module) => module.LinuxServerIOIntegration),
  gitHubContainerRegistry: () =>
    import("../github-container-registry/github-container-registry-integration").then(
      (module) => module.GitHubContainerRegistryIntegration,
    ),
  ical: () => import("../ical/ical-integration").then((module) => module.ICalIntegration),
  quay: () => import("../quay/quay-integration").then((module) => module.QuayIntegration),
  ntfy: () => import("../ntfy/ntfy-integration").then((module) => module.NTFYIntegration),
  mock: () => import("../mock/mock-integration").then((module) => module.MockIntegration),
  truenas: () => import("../truenas/truenas-integration").then((module) => module.TrueNasIntegration),
  unraid: () => import("../unraid/unraid-integration").then((module) => module.UnraidIntegration),
} satisfies Record<
  IntegrationKind,
  () => Promise<[(input: IntegrationInput) => Promise<Integration>] | IntegrationInstance>
>;

type IntegrationInstanceOfKind<TKind extends keyof typeof integrationCreators> = {
  [kind in TKind]: (typeof integrationCreators)[kind] extends [(input: IntegrationInput) => Promise<Integration>]
    ? Awaited<ReturnType<(typeof integrationCreators)[kind][0]>>
    : (typeof integrationCreators)[kind] extends IntegrationInstance
      ? InstanceType<(typeof integrationCreators)[kind]>
      : never;
}[TKind];
