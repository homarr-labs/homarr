import type { IntegrationKind } from "@homarr/definitions";

import { createRetryableLoader } from "@homarr/common";

import type { Integration, IntegrationInput } from "./integration";
import type { IntegrationInstanceOfKind } from "./kind-map";

type IntegrationCtor = new (integration: IntegrationInput) => Integration;
type IntegrationFactory = (integration: IntegrationInput) => Promise<Integration>;
type IntegrationLoader = () => Promise<IntegrationCtor | [IntegrationFactory]>;

const integrationLoaders: Record<IntegrationKind, IntegrationLoader> = {
  anchor: () => import("../anchor/anchor-integration").then((m) => m.AnchorIntegration),
  adGuardHome: () => import("../adguard-home/adguard-home-integration").then((m) => m.AdGuardHomeIntegration),
  archiveTeamWarrior: () =>
    import("../archive-team-warrior/archive-team-warrior-integration").then((m) => m.ArchiveTeamWarriorIntegration),
  aria2: () => import("../download-client/aria2/aria2-integration").then((m) => m.Aria2Integration),
  audiobookshelf: () => import("../audiobookshelf/audiobookshelf-integration").then((m) => m.AudiobookshelfIntegration),
  bazarr: () => import("../bazarr/bazarr-integration").then((m) => m.BazarrIntegration),
  beszel: () => import("../beszel/beszel-integration").then((m) => m.BeszelIntegration),
  coolify: () => import("../coolify/coolify-integration").then((m) => m.CoolifyIntegration),
  dashDot: () => import("../dashdot/dashdot-integration").then((m) => m.DashDotIntegration),
  deluge: () => import("../download-client/deluge/deluge-integration").then((m) => m.DelugeIntegration),
  emby: () => import("../emby/emby-integration").then((m) => m.EmbyIntegration),
  glances: () => import("../glances/glances-integration").then((m) => m.GlancesIntegration),
  gluetun: () => import("../gluetun/gluetun-integration").then((m) => m.GluetunIntegration),
  gotify: () => import("../gotify/gotify-integration").then((m) => m.GotifyIntegration),
  homeAssistant: () => import("../homeassistant/homeassistant-integration").then((m) => m.HomeAssistantIntegration),
  ical: () => import("../ical/ical-integration").then((m) => m.ICalIntegration),
  immich: () => import("../immich/immich-integration").then((m) => m.ImmichIntegration),
  jellyfin: () => import("../jellyfin/jellyfin-integration").then((m) => m.JellyfinIntegration),
  jellyseerr: () => import("../jellyseerr/jellyseerr-integration").then((m) => m.JellyseerrIntegration),
  lidarr: () => import("../media-organizer/lidarr/lidarr-integration").then((m) => m.LidarrIntegration),
  mock: () => import("../mock/mock-integration").then((m) => m.MockIntegration),
  navidrome: () => import("../navidrome/navidrome-integration").then((m) => m.NavidromeIntegration),
  nextcloud: () => import("../nextcloud/nextcloud.integration").then((m) => m.NextcloudIntegration),
  ntfy: () => import("../ntfy/ntfy-integration").then((m) => m.NTFYIntegration),
  nzbGet: () => import("../download-client/nzbget/nzbget-integration").then((m) => m.NzbGetIntegration),
  openmediavault: () =>
    import("../openmediavault/openmediavault-integration").then((m) => m.OpenMediaVaultIntegration),
  opnsense: () => import("../opnsense/opnsense-integration").then((m) => m.OPNsenseIntegration),
  overseerr: () => import("../overseerr/overseerr-integration").then((m) => m.OverseerrIntegration),
  paperlessNgx: () => import("../paperless-ngx/paperless-ngx-integration").then((m) => m.PaperlessNgxIntegration),
  patchmon: () => import("../patchmon/patchmon-integration").then((m) => m.PatchMonIntegration),
  peaNut: () => import("../peanut/peanut-integration").then((m) => m.PeaNutIntegration),
  piHole: () =>
    import("../pi-hole/pi-hole-integration-factory").then((m) => [m.createPiHoleIntegrationAsync] as [IntegrationFactory]),
  plex: () => import("../plex/plex-integration").then((m) => m.PlexIntegration),
  prowlarr: () => import("../prowlarr/prowlarr-integration").then((m) => m.ProwlarrIntegration),
  proxmox: () => import("../proxmox/proxmox-integration").then((m) => m.ProxmoxIntegration),
  qBittorrent: () =>
    import("../download-client/qbittorrent/qbittorrent-integration").then((m) => m.QBitTorrentIntegration),
  radarr: () => import("../media-organizer/radarr/radarr-integration").then((m) => m.RadarrIntegration),
  readarr: () => import("../media-organizer/readarr/readarr-integration").then((m) => m.ReadarrIntegration),
  sabNzbd: () => import("../download-client/sabnzbd/sabnzbd-integration").then((m) => m.SabnzbdIntegration),
  seerr: () => import("../seerr/seerr-integration").then((m) => m.SeerrIntegration),
  slskd: () => import("../download-client/slskd/slskd-integration").then((m) => m.SlskdIntegration),
  sonarr: () => import("../media-organizer/sonarr/sonarr-integration").then((m) => m.SonarrIntegration),
  speedtestTracker: () =>
    import("../speedtest-tracker/speedtest-tracker-integration").then((m) => m.SpeedtestTrackerIntegration),
  synology: () => import("../synology/synology-integration").then((m) => m.SynologyIntegration),
  tdarr: () => import("../media-transcoding/tdarr-integration").then((m) => m.TdarrIntegration),
  technitiumDns: () =>
    import("../technitium/technitium-integration-factory").then(
      (m) => [m.createTechnitiumDnsIntegrationAsync] as [IntegrationFactory],
    ),
  tracearr: () => import("../tracearr/tracearr-integration").then((m) => m.TracearrIntegration),
  traefik: () => import("../traefik/traefik-integration").then((m) => m.TraefikIntegration),
  transmission: () =>
    import("../download-client/transmission/transmission-integration").then((m) => m.TransmissionIntegration),
  truenas: () => import("../truenas/truenas-integration").then((m) => m.TrueNasIntegration),
  umami: () => import("../umami/umami-integration").then((m) => m.UmamiIntegration),
  unifiController: () =>
    import("../unifi-controller/unifi-controller-integration").then((m) => m.UnifiControllerIntegration),
  unraid: () => import("../unraid/unraid-integration").then((m) => m.UnraidIntegration),
  uptimeKuma: () => import("../uptime-kuma/uptime-kuma-integration").then((m) => m.UptimeKumaIntegration),
};

export const integrationLoaderKinds = Object.keys(integrationLoaders) as IntegrationKind[];

const loadIntegrationCreator = createRetryableLoader(
  new Map(Object.entries(integrationLoaders) as [IntegrationKind, IntegrationLoader][]),
);

export const createIntegrationAsync = async <TKind extends IntegrationKind>(
  integration: IntegrationInput & { kind: TKind },
): Promise<IntegrationInstanceOfKind<TKind>> => {
  if (!(integration.kind in integrationLoaders)) {
    throw new Error(
      `Unknown integration kind ${integration.kind}. Did you forget to add it to the integration creator?`,
    );
  }

  const creator = await loadIntegrationCreator(integration.kind);

  if (Array.isArray(creator)) {
    return (await creator[0](integration)) as IntegrationInstanceOfKind<TKind>;
  }

  return new creator(integration) as IntegrationInstanceOfKind<TKind>;
};
