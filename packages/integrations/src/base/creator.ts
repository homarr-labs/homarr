import type { IntegrationKind } from "@homarr/definitions";

import type { Integration, IntegrationInput } from "./integration";

type IntegrationInstance = new (integration: IntegrationInput) => Integration;

// Lazy-load integration modules instead of eagerly importing all ~40 integration classes.
// Each key maps to a factory that dynamically imports only the needed module.
// This avoids loading ~12K lines of integration code at startup for integrations that are never used.
export const createIntegrationAsync = async <TKind extends keyof typeof integrationCreators>(
  integration: IntegrationInput & { kind: TKind },
) => {
  if (!(integration.kind in integrationCreators)) {
    throw new Error(
      `Unknown integration kind ${integration.kind}. Did you forget to add it to the integration creator?`,
    );
  }

  const result = await integrationCreators[integration.kind]();

  // factories are an array, to differentiate in js between class constructors and functions
  if (Array.isArray(result)) {
    return (await result[0](integration)) as IntegrationInstanceOfKind<TKind>;
  }

  return new result(integration) as IntegrationInstanceOfKind<TKind>;
};

// Each lazy factory returns the integration class (or an array-wrapped async factory for special cases).
// Dynamic imports ensure the module and its dependencies are only loaded when that integration is actually needed.
export const integrationCreators: Record<
  IntegrationKind,
  () => Promise<IntegrationInstance | [(input: IntegrationInput) => Promise<Integration>]>
> = {
  anchor: async () => (await import("../anchor/anchor-integration")).AnchorIntegration,
  piHole: async () => [(await import("../pi-hole/pi-hole-integration-factory")).createPiHoleIntegrationAsync],
  adGuardHome: async () => (await import("../adguard-home/adguard-home-integration")).AdGuardHomeIntegration,
  homeAssistant: async () => (await import("../homeassistant/homeassistant-integration")).HomeAssistantIntegration,
  jellyfin: async () => (await import("../jellyfin/jellyfin-integration")).JellyfinIntegration,
  plex: async () => (await import("../plex/plex-integration")).PlexIntegration,
  sonarr: async () => (await import("../media-organizer/sonarr/sonarr-integration")).SonarrIntegration,
  radarr: async () => (await import("../media-organizer/radarr/radarr-integration")).RadarrIntegration,
  sabNzbd: async () => (await import("../download-client/sabnzbd/sabnzbd-integration")).SabnzbdIntegration,
  nzbGet: async () => (await import("../download-client/nzbget/nzbget-integration")).NzbGetIntegration,
  qBittorrent: async () => (await import("../download-client/qbittorrent/qbittorrent-integration")).QBitTorrentIntegration,
  deluge: async () => (await import("../download-client/deluge/deluge-integration")).DelugeIntegration,
  transmission: async () => (await import("../download-client/transmission/transmission-integration")).TransmissionIntegration,
  slskd: async () => (await import("../download-client/slskd/slskd-integration")).SlskdIntegration,
  aria2: async () => (await import("../download-client/aria2/aria2-integration")).Aria2Integration,
  jellyseerr: async () => (await import("../jellyseerr/jellyseerr-integration")).JellyseerrIntegration,
  seerr: async () => (await import("../seerr/seerr-integration")).SeerrIntegration,
  overseerr: async () => (await import("../overseerr/overseerr-integration")).OverseerrIntegration,
  prowlarr: async () => (await import("../prowlarr/prowlarr-integration")).ProwlarrIntegration,
  openmediavault: async () => (await import("../openmediavault/openmediavault-integration")).OpenMediaVaultIntegration,
  lidarr: async () => (await import("../media-organizer/lidarr/lidarr-integration")).LidarrIntegration,
  readarr: async () => (await import("../media-organizer/readarr/readarr-integration")).ReadarrIntegration,
  dashDot: async () => (await import("../dashdot/dashdot-integration")).DashDotIntegration,
  tdarr: async () => (await import("../media-transcoding/tdarr-integration")).TdarrIntegration,
  proxmox: async () => (await import("../proxmox/proxmox-integration")).ProxmoxIntegration,
  emby: async () => (await import("../emby/emby-integration")).EmbyIntegration,
  nextcloud: async () => (await import("../nextcloud/nextcloud.integration")).NextcloudIntegration,
  unifiController: async () => (await import("../unifi-controller/unifi-controller-integration")).UnifiControllerIntegration,
  opnsense: async () => (await import("../opnsense/opnsense-integration")).OPNsenseIntegration,
  github: async () => (await import("../github/github-integration")).GithubIntegration,
  dockerHub: async () => (await import("../docker-hub/docker-hub-integration")).DockerHubIntegration,
  gitlab: async () => (await import("../gitlab/gitlab-integration")).GitlabIntegration,
  npm: async () => (await import("../npm/npm-integration")).NPMIntegration,
  codeberg: async () => (await import("../codeberg/codeberg-integration")).CodebergIntegration,
  linuxServerIO: async () => (await import("../linuxserverio/linuxserverio-integration")).LinuxServerIOIntegration,
  gitHubContainerRegistry: async () =>
    (await import("../github-container-registry/github-container-registry-integration"))
      .GitHubContainerRegistryIntegration,
  ical: async () => (await import("../ical/ical-integration")).ICalIntegration,
  quay: async () => (await import("../quay/quay-integration")).QuayIntegration,
  ntfy: async () => (await import("../ntfy/ntfy-integration")).NTFYIntegration,
  mock: async () => (await import("../mock/mock-integration")).MockIntegration,
  truenas: async () => (await import("../truenas/truenas-integration")).TrueNasIntegration,
  unraid: async () => (await import("../unraid/unraid-integration")).UnraidIntegration,
  coolify: async () => (await import("../coolify/coolify-integration")).CoolifyIntegration,
  tracearr: async () => (await import("../tracearr/tracearr-integration")).TracearrIntegration,
  glances: async () => (await import("../glances/glances-integration")).GlancesIntegration,
  searchCh: async () => (await import("../search-ch/search-ch-integration")).SearchChIntegration,
  immich: async () => (await import("../immich/immich-integration")).ImmichIntegration,
  speedtestTracker: async () =>
    (await import("../speedtest-tracker/speedtest-tracker-integration")).SpeedtestTrackerIntegration,
};

// Type-level map: resolves the lazy factory back to the concrete integration instance type.
// We manually enumerate the kind→instance mapping because the lazy factories obscure the direct class reference.
type ResolvedIntegration<K extends IntegrationKind> = K extends "piHole"
  ? Awaited<ReturnType<(typeof integrationCreators)["piHole"]> extends (infer T)[] ? T : never>
  : (typeof integrationCreators)[K] extends () => Promise<infer C>
    ? C extends IntegrationInstance
      ? InstanceType<C>
      : never
    : never;

type IntegrationInstanceOfKind<TKind extends keyof typeof integrationCreators> = {
  [kind in TKind]: ResolvedIntegration<kind>;
}[TKind];
