import type { IntegrationKind } from "@homarr/definitions";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import type { Integration, IntegrationInput } from "./integration";

const logger = createLogger({ module: "integrationFactory" });

// Keep each import path explicit so Node and Turbopack can discover every lazy integration chunk.
const integrationCreators = {
  anchor: async (input: IntegrationInput) =>
    new (await import("../anchor/anchor-integration")).AnchorIntegration(input),
  piHole: async (input: IntegrationInput) =>
    (await import("../pi-hole/pi-hole-integration-factory")).createPiHoleIntegrationAsync(input),
  adGuardHome: async (input: IntegrationInput) =>
    new (await import("../adguard-home/adguard-home-integration")).AdGuardHomeIntegration(input),
  technitiumDns: async (input: IntegrationInput) =>
    (await import("../technitium/technitium-integration-factory")).createTechnitiumDnsIntegrationAsync(input),
  homeAssistant: async (input: IntegrationInput) =>
    new (await import("../homeassistant/homeassistant-integration")).HomeAssistantIntegration(input),
  jellyfin: async (input: IntegrationInput) =>
    new (await import("../jellyfin/jellyfin-integration")).JellyfinIntegration(input),
  plex: async (input: IntegrationInput) => new (await import("../plex/plex-integration")).PlexIntegration(input),
  sonarr: async (input: IntegrationInput) =>
    new (await import("../media-organizer/sonarr/sonarr-integration")).SonarrIntegration(input),
  radarr: async (input: IntegrationInput) =>
    new (await import("../media-organizer/radarr/radarr-integration")).RadarrIntegration(input),
  sabNzbd: async (input: IntegrationInput) =>
    new (await import("../download-client/sabnzbd/sabnzbd-integration")).SabnzbdIntegration(input),
  nzbGet: async (input: IntegrationInput) =>
    new (await import("../download-client/nzbget/nzbget-integration")).NzbGetIntegration(input),
  qBittorrent: async (input: IntegrationInput) =>
    new (await import("../download-client/qbittorrent/qbittorrent-integration")).QBitTorrentIntegration(input),
  deluge: async (input: IntegrationInput) =>
    new (await import("../download-client/deluge/deluge-integration")).DelugeIntegration(input),
  transmission: async (input: IntegrationInput) =>
    new (await import("../download-client/transmission/transmission-integration")).TransmissionIntegration(input),
  slskd: async (input: IntegrationInput) =>
    new (await import("../download-client/slskd/slskd-integration")).SlskdIntegration(input),
  aria2: async (input: IntegrationInput) =>
    new (await import("../download-client/aria2/aria2-integration")).Aria2Integration(input),
  jellyseerr: async (input: IntegrationInput) =>
    new (await import("../jellyseerr/jellyseerr-integration")).JellyseerrIntegration(input),
  seerr: async (input: IntegrationInput) => new (await import("../seerr/seerr-integration")).SeerrIntegration(input),
  overseerr: async (input: IntegrationInput) =>
    new (await import("../overseerr/overseerr-integration")).OverseerrIntegration(input),
  prowlarr: async (input: IntegrationInput) =>
    new (await import("../prowlarr/prowlarr-integration")).ProwlarrIntegration(input),
  openmediavault: async (input: IntegrationInput) =>
    new (await import("../openmediavault/openmediavault-integration")).OpenMediaVaultIntegration(input),
  lidarr: async (input: IntegrationInput) =>
    new (await import("../media-organizer/lidarr/lidarr-integration")).LidarrIntegration(input),
  readarr: async (input: IntegrationInput) =>
    new (await import("../media-organizer/readarr/readarr-integration")).ReadarrIntegration(input),
  dashDot: async (input: IntegrationInput) =>
    new (await import("../dashdot/dashdot-integration")).DashDotIntegration(input),
  tdarr: async (input: IntegrationInput) =>
    new (await import("../media-transcoding/tdarr-integration")).TdarrIntegration(input),
  proxmox: async (input: IntegrationInput) =>
    new (await import("../proxmox/proxmox-integration")).ProxmoxIntegration(input),
  emby: async (input: IntegrationInput) => new (await import("../emby/emby-integration")).EmbyIntegration(input),
  nextcloud: async (input: IntegrationInput) =>
    new (await import("../nextcloud/nextcloud.integration")).NextcloudIntegration(input),
  unifiController: async (input: IntegrationInput) =>
    new (await import("../unifi-controller/unifi-controller-integration")).UnifiControllerIntegration(input),
  opnsense: async (input: IntegrationInput) =>
    new (await import("../opnsense/opnsense-integration")).OPNsenseIntegration(input),
  ical: async (input: IntegrationInput) => new (await import("../ical/ical-integration")).ICalIntegration(input),
  ntfy: async (input: IntegrationInput) => new (await import("../ntfy/ntfy-integration")).NTFYIntegration(input),
  gotify: async (input: IntegrationInput) =>
    new (await import("../gotify/gotify-integration")).GotifyIntegration(input),
  mock: async (input: IntegrationInput) => new (await import("../mock/mock-integration")).MockIntegration(input),
  truenas: async (input: IntegrationInput) =>
    new (await import("../truenas/truenas-integration")).TrueNasIntegration(input),
  synology: async (input: IntegrationInput) =>
    new (await import("../synology/synology-integration")).SynologyIntegration(input),
  unraid: async (input: IntegrationInput) =>
    new (await import("../unraid/unraid-integration")).UnraidIntegration(input),
  coolify: async (input: IntegrationInput) =>
    new (await import("../coolify/coolify-integration")).CoolifyIntegration(input),
  tracearr: async (input: IntegrationInput) =>
    new (await import("../tracearr/tracearr-integration")).TracearrIntegration(input),
  glances: async (input: IntegrationInput) =>
    new (await import("../glances/glances-integration")).GlancesIntegration(input),
  immich: async (input: IntegrationInput) =>
    new (await import("../immich/immich-integration")).ImmichIntegration(input),
  paperlessNgx: async (input: IntegrationInput) =>
    new (await import("../paperless-ngx/paperless-ngx-integration")).PaperlessNgxIntegration(input),
  patchmon: async (input: IntegrationInput) =>
    new (await import("../patchmon/patchmon-integration")).PatchMonIntegration(input),
  speedtestTracker: async (input: IntegrationInput) =>
    new (await import("../speedtest-tracker/speedtest-tracker-integration")).SpeedtestTrackerIntegration(input),
  audiobookshelf: async (input: IntegrationInput) =>
    new (await import("../audiobookshelf/audiobookshelf-integration")).AudiobookshelfIntegration(input),
  navidrome: async (input: IntegrationInput) =>
    new (await import("../navidrome/navidrome-integration")).NavidromeIntegration(input),
  umami: async (input: IntegrationInput) => new (await import("../umami/umami-integration")).UmamiIntegration(input),
  gluetun: async (input: IntegrationInput) =>
    new (await import("../gluetun/gluetun-integration")).GluetunIntegration(input),
  archiveTeamWarrior: async (input: IntegrationInput) =>
    new (await import("../archive-team-warrior/archive-team-warrior-integration")).ArchiveTeamWarriorIntegration(input),
  uptimeKuma: async (input: IntegrationInput) =>
    new (await import("../uptime-kuma/uptime-kuma-integration")).UptimeKumaIntegration(input),
  peaNut: async (input: IntegrationInput) =>
    new (await import("../peanut/peanut-integration")).PeaNutIntegration(input),
  beszel: async (input: IntegrationInput) =>
    new (await import("../beszel/beszel-integration")).BeszelIntegration(input),
  bazarr: async (input: IntegrationInput) =>
    new (await import("../bazarr/bazarr-integration")).BazarrIntegration(input),
  traefik: async (input: IntegrationInput) =>
    new (await import("../traefik/traefik-integration")).TraefikIntegration(input),
  wud: async (input: IntegrationInput) => new (await import("../wud/wud-integration")).WudIntegration(input),
} satisfies Record<IntegrationKind, (input: IntegrationInput) => Promise<Integration>>;

type IntegrationCreators = typeof integrationCreators;
type IntegrationInstanceOfKind<TKind extends keyof IntegrationCreators> = Awaited<
  ReturnType<IntegrationCreators[TKind]>
>;

export function createIntegrationAsync<TKind extends keyof IntegrationCreators>(
  integration: IntegrationInput & { kind: TKind },
): Promise<IntegrationInstanceOfKind<TKind>>;
export async function createIntegrationAsync(
  integration: IntegrationInput & { kind: IntegrationKind },
): Promise<Integration> {
  if (!Object.hasOwn(integrationCreators, integration.kind)) {
    logger.warn("Integration client creation refused", {
      integrationId: integration.id,
      integrationKind: integration.kind,
      reason: "integration-kind-unregistered",
    });
    throw new Error(
      `Unknown integration kind ${integration.kind}. Did you forget to add it to the integration creator?`,
    );
  }

  const startedAt = Date.now();
  logger.debug("Creating integration client", { integrationId: integration.id, integrationKind: integration.kind });

  try {
    const instance = await integrationCreators[integration.kind](integration);
    logger.debug("Integration client created", {
      integrationId: integration.id,
      integrationKind: integration.kind,
      durationMs: Date.now() - startedAt,
    });
    return instance;
  } catch (error) {
    logger.warn(
      new ErrorWithMetadata(
        "Integration client creation failed",
        {
          integrationId: integration.id,
          integrationKind: integration.kind,
          durationMs: Date.now() - startedAt,
        },
        { cause: error },
      ),
    );
    throw error;
  }
}
