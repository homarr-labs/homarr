import type { IntegrationKind } from "@homarr/definitions";

import type { AdGuardHomeIntegration } from "../adguard-home/adguard-home-integration";
import type { AnchorIntegration } from "../anchor/anchor-integration";
import type { CodebergIntegration } from "../codeberg/codeberg-integration";
import type { CoolifyIntegration } from "../coolify/coolify-integration";
import type { DashDotIntegration } from "../dashdot/dashdot-integration";
import type { DockerHubIntegration } from "../docker-hub/docker-hub-integration";
import type { Aria2Integration } from "../download-client/aria2/aria2-integration";
import type { DelugeIntegration } from "../download-client/deluge/deluge-integration";
import type { NzbGetIntegration } from "../download-client/nzbget/nzbget-integration";
import type { QBitTorrentIntegration } from "../download-client/qbittorrent/qbittorrent-integration";
import type { SabnzbdIntegration } from "../download-client/sabnzbd/sabnzbd-integration";
import type { SlskdIntegration } from "../download-client/slskd/slskd-integration";
import type { TransmissionIntegration } from "../download-client/transmission/transmission-integration";
import type { EmbyIntegration } from "../emby/emby-integration";
import type { GitHubContainerRegistryIntegration } from "../github-container-registry/github-container-registry-integration";
import type { GithubIntegration } from "../github/github-integration";
import type { GitlabIntegration } from "../gitlab/gitlab-integration";
import type { GlancesIntegration } from "../glances/glances-integration";
import type { HomeAssistantIntegration } from "../homeassistant/homeassistant-integration";
import type { ICalIntegration } from "../ical/ical-integration";
import type { ImmichIntegration } from "../immich/immich-integration";
import type { JellyfinIntegration } from "../jellyfin/jellyfin-integration";
import type { JellyseerrIntegration } from "../jellyseerr/jellyseerr-integration";
import type { LinuxServerIOIntegration } from "../linuxserverio/linuxserverio-integration";
import type { LidarrIntegration } from "../media-organizer/lidarr/lidarr-integration";
import type { RadarrIntegration } from "../media-organizer/radarr/radarr-integration";
import type { ReadarrIntegration } from "../media-organizer/readarr/readarr-integration";
import type { SonarrIntegration } from "../media-organizer/sonarr/sonarr-integration";
import type { TdarrIntegration } from "../media-transcoding/tdarr-integration";
import type { MockIntegration } from "../mock/mock-integration";
import type { NextcloudIntegration } from "../nextcloud/nextcloud.integration";
import type { NPMIntegration } from "../npm/npm-integration";
import type { NTFYIntegration } from "../ntfy/ntfy-integration";
import type { OpenMediaVaultIntegration } from "../openmediavault/openmediavault-integration";
import type { OPNsenseIntegration } from "../opnsense/opnsense-integration";
import type { OverseerrIntegration } from "../overseerr/overseerr-integration";
import type { PiHoleIntegrationV5 } from "../pi-hole/v5/pi-hole-integration-v5";
import type { PiHoleIntegrationV6 } from "../pi-hole/v6/pi-hole-integration-v6";
import type { PlexIntegration } from "../plex/plex-integration";
import type { ProwlarrIntegration } from "../prowlarr/prowlarr-integration";
import type { ProxmoxIntegration } from "../proxmox/proxmox-integration";
import type { QuayIntegration } from "../quay/quay-integration";
import type { SearchChIntegration } from "../search-ch/search-ch-integration";
import type { SeerrIntegration } from "../seerr/seerr-integration";
import type { SpeedtestTrackerIntegration } from "../speedtest-tracker/speedtest-tracker-integration";
import type { TracearrIntegration } from "../tracearr/tracearr-integration";
import type { TrueNasIntegration } from "../truenas/truenas-integration";
import type { UnifiControllerIntegration } from "../unifi-controller/unifi-controller-integration";
import type { UnraidIntegration } from "../unraid/unraid-integration";
import type { Integration, IntegrationInput } from "./integration";

type IntegrationConstructor = new (integration: IntegrationInput) => Integration;

type IntegrationCreatorsMap = {
  anchor: new (input: IntegrationInput) => AnchorIntegration;
  piHole: [(input: IntegrationInput) => Promise<PiHoleIntegrationV5 | PiHoleIntegrationV6>];
  adGuardHome: new (input: IntegrationInput) => AdGuardHomeIntegration;
  homeAssistant: new (input: IntegrationInput) => HomeAssistantIntegration;
  jellyfin: new (input: IntegrationInput) => JellyfinIntegration;
  plex: new (input: IntegrationInput) => PlexIntegration;
  sonarr: new (input: IntegrationInput) => SonarrIntegration;
  radarr: new (input: IntegrationInput) => RadarrIntegration;
  sabNzbd: new (input: IntegrationInput) => SabnzbdIntegration;
  nzbGet: new (input: IntegrationInput) => NzbGetIntegration;
  qBittorrent: new (input: IntegrationInput) => QBitTorrentIntegration;
  deluge: new (input: IntegrationInput) => DelugeIntegration;
  transmission: new (input: IntegrationInput) => TransmissionIntegration;
  slskd: new (input: IntegrationInput) => SlskdIntegration;
  aria2: new (input: IntegrationInput) => Aria2Integration;
  jellyseerr: new (input: IntegrationInput) => JellyseerrIntegration;
  seerr: new (input: IntegrationInput) => SeerrIntegration;
  overseerr: new (input: IntegrationInput) => OverseerrIntegration;
  prowlarr: new (input: IntegrationInput) => ProwlarrIntegration;
  openmediavault: new (input: IntegrationInput) => OpenMediaVaultIntegration;
  lidarr: new (input: IntegrationInput) => LidarrIntegration;
  readarr: new (input: IntegrationInput) => ReadarrIntegration;
  dashDot: new (input: IntegrationInput) => DashDotIntegration;
  tdarr: new (input: IntegrationInput) => TdarrIntegration;
  proxmox: new (input: IntegrationInput) => ProxmoxIntegration;
  emby: new (input: IntegrationInput) => EmbyIntegration;
  nextcloud: new (input: IntegrationInput) => NextcloudIntegration;
  unifiController: new (input: IntegrationInput) => UnifiControllerIntegration;
  opnsense: new (input: IntegrationInput) => OPNsenseIntegration;
  github: new (input: IntegrationInput) => GithubIntegration;
  dockerHub: new (input: IntegrationInput) => DockerHubIntegration;
  gitlab: new (input: IntegrationInput) => GitlabIntegration;
  npm: new (input: IntegrationInput) => NPMIntegration;
  codeberg: new (input: IntegrationInput) => CodebergIntegration;
  linuxServerIO: new (input: IntegrationInput) => LinuxServerIOIntegration;
  gitHubContainerRegistry: new (input: IntegrationInput) => GitHubContainerRegistryIntegration;
  ical: new (input: IntegrationInput) => ICalIntegration;
  quay: new (input: IntegrationInput) => QuayIntegration;
  ntfy: new (input: IntegrationInput) => NTFYIntegration;
  mock: new (input: IntegrationInput) => MockIntegration;
  truenas: new (input: IntegrationInput) => TrueNasIntegration;
  unraid: new (input: IntegrationInput) => UnraidIntegration;
  coolify: new (input: IntegrationInput) => CoolifyIntegration;
  tracearr: new (input: IntegrationInput) => TracearrIntegration;
  glances: new (input: IntegrationInput) => GlancesIntegration;
  searchCh: new (input: IntegrationInput) => SearchChIntegration;
  immich: new (input: IntegrationInput) => ImmichIntegration;
  speedtestTracker: new (input: IntegrationInput) => SpeedtestTrackerIntegration;
};

type IntegrationInstanceOfKind<TKind extends IntegrationKind> = {
  [kind in TKind]: IntegrationCreatorsMap[kind] extends [(input: IntegrationInput) => Promise<infer R>]
    ? R
    : IntegrationCreatorsMap[kind] extends new (input: IntegrationInput) => infer R
      ? R
      : never;
}[TKind];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCreator = IntegrationConstructor | [(input: IntegrationInput) => Promise<Integration>];

const integrationLoaders: Record<IntegrationKind, () => Promise<AnyCreator>> = {
  anchor: () => import("../anchor/anchor-integration").then((m) => m.AnchorIntegration),
  piHole: async () => {
    const { createPiHoleIntegrationAsync } = await import("../pi-hole/pi-hole-integration-factory");
    return [createPiHoleIntegrationAsync];
  },
  adGuardHome: () => import("../adguard-home/adguard-home-integration").then((m) => m.AdGuardHomeIntegration),
  homeAssistant: () => import("../homeassistant/homeassistant-integration").then((m) => m.HomeAssistantIntegration),
  jellyfin: () => import("../jellyfin/jellyfin-integration").then((m) => m.JellyfinIntegration),
  plex: () => import("../plex/plex-integration").then((m) => m.PlexIntegration),
  sonarr: () => import("../media-organizer/sonarr/sonarr-integration").then((m) => m.SonarrIntegration),
  radarr: () => import("../media-organizer/radarr/radarr-integration").then((m) => m.RadarrIntegration),
  sabNzbd: () => import("../download-client/sabnzbd/sabnzbd-integration").then((m) => m.SabnzbdIntegration),
  nzbGet: () => import("../download-client/nzbget/nzbget-integration").then((m) => m.NzbGetIntegration),
  qBittorrent: () =>
    import("../download-client/qbittorrent/qbittorrent-integration").then((m) => m.QBitTorrentIntegration),
  deluge: () => import("../download-client/deluge/deluge-integration").then((m) => m.DelugeIntegration),
  transmission: () =>
    import("../download-client/transmission/transmission-integration").then((m) => m.TransmissionIntegration),
  slskd: () => import("../download-client/slskd/slskd-integration").then((m) => m.SlskdIntegration),
  aria2: () => import("../download-client/aria2/aria2-integration").then((m) => m.Aria2Integration),
  jellyseerr: () => import("../jellyseerr/jellyseerr-integration").then((m) => m.JellyseerrIntegration),
  seerr: () => import("../seerr/seerr-integration").then((m) => m.SeerrIntegration),
  overseerr: () => import("../overseerr/overseerr-integration").then((m) => m.OverseerrIntegration),
  prowlarr: () => import("../prowlarr/prowlarr-integration").then((m) => m.ProwlarrIntegration),
  openmediavault: () => import("../openmediavault/openmediavault-integration").then((m) => m.OpenMediaVaultIntegration),
  lidarr: () => import("../media-organizer/lidarr/lidarr-integration").then((m) => m.LidarrIntegration),
  readarr: () => import("../media-organizer/readarr/readarr-integration").then((m) => m.ReadarrIntegration),
  dashDot: () => import("../dashdot/dashdot-integration").then((m) => m.DashDotIntegration),
  tdarr: () => import("../media-transcoding/tdarr-integration").then((m) => m.TdarrIntegration),
  proxmox: () => import("../proxmox/proxmox-integration").then((m) => m.ProxmoxIntegration),
  emby: () => import("../emby/emby-integration").then((m) => m.EmbyIntegration),
  nextcloud: () => import("../nextcloud/nextcloud.integration").then((m) => m.NextcloudIntegration),
  unifiController: () =>
    import("../unifi-controller/unifi-controller-integration").then((m) => m.UnifiControllerIntegration),
  opnsense: () => import("../opnsense/opnsense-integration").then((m) => m.OPNsenseIntegration),
  github: () => import("../github/github-integration").then((m) => m.GithubIntegration),
  dockerHub: () => import("../docker-hub/docker-hub-integration").then((m) => m.DockerHubIntegration),
  gitlab: () => import("../gitlab/gitlab-integration").then((m) => m.GitlabIntegration),
  npm: () => import("../npm/npm-integration").then((m) => m.NPMIntegration),
  codeberg: () => import("../codeberg/codeberg-integration").then((m) => m.CodebergIntegration),
  linuxServerIO: () => import("../linuxserverio/linuxserverio-integration").then((m) => m.LinuxServerIOIntegration),
  gitHubContainerRegistry: () =>
    import("../github-container-registry/github-container-registry-integration").then(
      (m) => m.GitHubContainerRegistryIntegration,
    ),
  ical: () => import("../ical/ical-integration").then((m) => m.ICalIntegration),
  quay: () => import("../quay/quay-integration").then((m) => m.QuayIntegration),
  ntfy: () => import("../ntfy/ntfy-integration").then((m) => m.NTFYIntegration),
  mock: () => import("../mock/mock-integration").then((m) => m.MockIntegration),
  truenas: () => import("../truenas/truenas-integration").then((m) => m.TrueNasIntegration),
  unraid: () => import("../unraid/unraid-integration").then((m) => m.UnraidIntegration),
  coolify: () => import("../coolify/coolify-integration").then((m) => m.CoolifyIntegration),
  tracearr: () => import("../tracearr/tracearr-integration").then((m) => m.TracearrIntegration),
  glances: () => import("../glances/glances-integration").then((m) => m.GlancesIntegration),
  searchCh: () => import("../search-ch/search-ch-integration").then((m) => m.SearchChIntegration),
  immich: () => import("../immich/immich-integration").then((m) => m.ImmichIntegration),
  speedtestTracker: () =>
    import("../speedtest-tracker/speedtest-tracker-integration").then((m) => m.SpeedtestTrackerIntegration),
};

export const createIntegrationAsync = async <TKind extends IntegrationKind>(
  integration: IntegrationInput & { kind: TKind },
): Promise<IntegrationInstanceOfKind<TKind>> => {
  if (!(integration.kind in integrationLoaders)) {
    throw new Error(
      `Unknown integration kind ${integration.kind}. Did you forget to add it to the integration loader?`,
    );
  }

  const creator = await integrationLoaders[integration.kind]();

  if (Array.isArray(creator)) {
    return (await creator[0](integration)) as IntegrationInstanceOfKind<TKind>;
  }

  return new (creator as IntegrationConstructor)(integration) as IntegrationInstanceOfKind<TKind>;
};
