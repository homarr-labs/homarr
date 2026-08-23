import type { IntegrationKind } from "@homarr/definitions";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import { generatedIntegrationCreatorLoaders } from "../generated/integration-creators";
import type { Integration, IntegrationInput } from "./integration";

const logger = createLogger({ module: "integrationFactory" });

type IntegrationCreator<TIntegration extends Integration = Integration> = (
  input: IntegrationInput,
) => Promise<TIntegration>;

type IntegrationConstructor<TIntegration extends Integration = Integration> = new (
  input: IntegrationInput,
) => TIntegration;

const createConstructorCreator =
  <TIntegration extends Integration>(
    IntegrationClass: IntegrationConstructor<TIntegration>,
  ): IntegrationCreator<TIntegration> =>
  async (input) =>
    new IntegrationClass(input);

// Keep each import path explicit so Node and Turbopack can discover every lazy integration chunk.
const integrationCreatorLoaders = {
  anchor: async () => createConstructorCreator((await import("../anchor/anchor-integration")).AnchorIntegration),
  piHole: async () => (await import("../pi-hole/pi-hole-integration-factory")).createPiHoleIntegrationAsync,
  adGuardHome: async () =>
    createConstructorCreator((await import("../adguard-home/adguard-home-integration")).AdGuardHomeIntegration),
  technitiumDns: async () =>
    (await import("../technitium/technitium-integration-factory")).createTechnitiumDnsIntegrationAsync,
  homeAssistant: async () =>
    createConstructorCreator((await import("../homeassistant/homeassistant-integration")).HomeAssistantIntegration),
  jellyfin: async () =>
    createConstructorCreator((await import("../jellyfin/jellyfin-integration")).JellyfinIntegration),
  plex: async () => createConstructorCreator((await import("../plex/plex-integration")).PlexIntegration),
  sonarr: async () =>
    createConstructorCreator((await import("../media-organizer/sonarr/sonarr-integration")).SonarrIntegration),
  radarr: async () =>
    createConstructorCreator((await import("../media-organizer/radarr/radarr-integration")).RadarrIntegration),
  sabNzbd: async () =>
    createConstructorCreator((await import("../download-client/sabnzbd/sabnzbd-integration")).SabnzbdIntegration),
  nzbGet: async () =>
    createConstructorCreator((await import("../download-client/nzbget/nzbget-integration")).NzbGetIntegration),
  qBittorrent: async () =>
    createConstructorCreator(
      (await import("../download-client/qbittorrent/qbittorrent-integration")).QBitTorrentIntegration,
    ),
  deluge: async () =>
    createConstructorCreator((await import("../download-client/deluge/deluge-integration")).DelugeIntegration),
  transmission: async () =>
    createConstructorCreator(
      (await import("../download-client/transmission/transmission-integration")).TransmissionIntegration,
    ),
  slskd: async () =>
    createConstructorCreator((await import("../download-client/slskd/slskd-integration")).SlskdIntegration),
  aria2: async () =>
    createConstructorCreator((await import("../download-client/aria2/aria2-integration")).Aria2Integration),
  jellyseerr: async () =>
    createConstructorCreator((await import("../jellyseerr/jellyseerr-integration")).JellyseerrIntegration),
  seerr: async () => createConstructorCreator((await import("../seerr/seerr-integration")).SeerrIntegration),
  overseerr: async () =>
    createConstructorCreator((await import("../overseerr/overseerr-integration")).OverseerrIntegration),
  prowlarr: async () =>
    createConstructorCreator((await import("../prowlarr/prowlarr-integration")).ProwlarrIntegration),
  openmediavault: async () =>
    createConstructorCreator((await import("../openmediavault/openmediavault-integration")).OpenMediaVaultIntegration),
  lidarr: async () =>
    createConstructorCreator((await import("../media-organizer/lidarr/lidarr-integration")).LidarrIntegration),
  readarr: async () =>
    createConstructorCreator((await import("../media-organizer/readarr/readarr-integration")).ReadarrIntegration),
  dashDot: async () => createConstructorCreator((await import("../dashdot/dashdot-integration")).DashDotIntegration),
  tdarr: async () =>
    createConstructorCreator((await import("../media-transcoding/tdarr-integration")).TdarrIntegration),
  proxmox: async () => createConstructorCreator((await import("../proxmox/proxmox-integration")).ProxmoxIntegration),
  emby: async () => createConstructorCreator((await import("../emby/emby-integration")).EmbyIntegration),
  nextcloud: async () =>
    createConstructorCreator((await import("../nextcloud/nextcloud.integration")).NextcloudIntegration),
  unifiController: async () =>
    createConstructorCreator(
      (await import("../unifi-controller/unifi-controller-integration")).UnifiControllerIntegration,
    ),
  opnsense: async () =>
    createConstructorCreator((await import("../opnsense/opnsense-integration")).OPNsenseIntegration),
  ical: async () => createConstructorCreator((await import("../ical/ical-integration")).ICalIntegration),
  ntfy: async () => createConstructorCreator((await import("../ntfy/ntfy-integration")).NTFYIntegration),
  gotify: async () => createConstructorCreator((await import("../gotify/gotify-integration")).GotifyIntegration),
  mock: async () => createConstructorCreator((await import("../mock/mock-integration")).MockIntegration),
  truenas: async () => createConstructorCreator((await import("../truenas/truenas-integration")).TrueNasIntegration),
  synology: async () =>
    createConstructorCreator((await import("../synology/synology-integration")).SynologyIntegration),
  unraid: async () => createConstructorCreator((await import("../unraid/unraid-integration")).UnraidIntegration),
  coolify: async () => createConstructorCreator((await import("../coolify/coolify-integration")).CoolifyIntegration),
  tracearr: async () =>
    createConstructorCreator((await import("../tracearr/tracearr-integration")).TracearrIntegration),
  glances: async () => createConstructorCreator((await import("../glances/glances-integration")).GlancesIntegration),
  immich: async () => createConstructorCreator((await import("../immich/immich-integration")).ImmichIntegration),
  paperlessNgx: async () =>
    createConstructorCreator((await import("../paperless-ngx/paperless-ngx-integration")).PaperlessNgxIntegration),
  patchmon: async () =>
    createConstructorCreator((await import("../patchmon/patchmon-integration")).PatchMonIntegration),
  speedtestTracker: async () =>
    createConstructorCreator(
      (await import("../speedtest-tracker/speedtest-tracker-integration")).SpeedtestTrackerIntegration,
    ),
  audiobookshelf: async () =>
    createConstructorCreator((await import("../audiobookshelf/audiobookshelf-integration")).AudiobookshelfIntegration),
  navidrome: async () =>
    createConstructorCreator((await import("../navidrome/navidrome-integration")).NavidromeIntegration),
  umami: async () => createConstructorCreator((await import("../umami/umami-integration")).UmamiIntegration),
  gluetun: async () => createConstructorCreator((await import("../gluetun/gluetun-integration")).GluetunIntegration),
  archiveTeamWarrior: async () =>
    createConstructorCreator(
      (await import("../archive-team-warrior/archive-team-warrior-integration")).ArchiveTeamWarriorIntegration,
    ),
  uptimeKuma: async () =>
    createConstructorCreator((await import("../uptime-kuma/uptime-kuma-integration")).UptimeKumaIntegration),
  peaNut: async () => createConstructorCreator((await import("../peanut/peanut-integration")).PeaNutIntegration),
  ...generatedIntegrationCreatorLoaders,
  bazarr: async () => createConstructorCreator((await import("../bazarr/bazarr-integration")).BazarrIntegration),
  traefik: async () => createConstructorCreator((await import("../traefik/traefik-integration")).TraefikIntegration),
  wud: async () => createConstructorCreator((await import("../wud/wud-integration")).WudIntegration),
};

type AssertIntegrationCreatorLoaders<TLoaders extends Record<IntegrationKind, () => Promise<IntegrationCreator>>> =
  TLoaders;
type AssertNoUnexpectedIntegrationKinds<TKind extends never> = TKind;
type IntegrationCreatorLoadersCheck = AssertIntegrationCreatorLoaders<typeof integrationCreatorLoaders>;
type UnexpectedIntegrationKindsCheck = AssertNoUnexpectedIntegrationKinds<
  Exclude<keyof typeof integrationCreatorLoaders, IntegrationKind>
>;

type IntegrationCreatorLoaders = IntegrationCreatorLoadersCheck & Record<UnexpectedIntegrationKindsCheck, never>;
type IntegrationCreatorOfKind<TKind extends keyof IntegrationCreatorLoaders> = Awaited<
  ReturnType<IntegrationCreatorLoaders[TKind]>
>;
type IntegrationInstanceOfKind<TKind extends keyof IntegrationCreatorLoaders> = Awaited<
  ReturnType<IntegrationCreatorOfKind<TKind>>
>;

const integrationCreatorCache = new Map<IntegrationKind, Promise<IntegrationCreator>>();

const loadIntegrationCreatorAsync = async <TKind extends keyof IntegrationCreatorLoaders>(
  kind: TKind,
): Promise<IntegrationCreatorOfKind<TKind>> => {
  const cachedCreator = integrationCreatorCache.get(kind);
  if (cachedCreator) {
    return (await cachedCreator) as IntegrationCreatorOfKind<TKind>;
  }

  const startedAt = Date.now();
  logger.debug("Loading integration implementation", { integrationKind: kind });
  const creatorPromise = integrationCreatorLoaders[kind]();
  integrationCreatorCache.set(kind, creatorPromise);

  try {
    const creator = (await creatorPromise) as IntegrationCreatorOfKind<TKind>;
    logger.debug("Integration implementation loaded", {
      integrationKind: kind,
      durationMs: Date.now() - startedAt,
    });
    return creator;
  } catch (error) {
    if (integrationCreatorCache.get(kind) === creatorPromise) {
      integrationCreatorCache.delete(kind);
    }
    logger.warn(
      new ErrorWithMetadata(
        "Integration implementation failed to load",
        {
          integrationKind: kind,
          durationMs: Date.now() - startedAt,
        },
        { cause: error },
      ),
    );
    throw error;
  }
};

export const createIntegrationAsync = async <TKind extends keyof IntegrationCreatorLoaders>(
  integration: IntegrationInput & { kind: TKind },
): Promise<IntegrationInstanceOfKind<TKind>> => {
  if (!Object.hasOwn(integrationCreatorLoaders, integration.kind)) {
    logger.warn("Integration client creation refused", {
      integrationId: integration.id,
      integrationKind: integration.kind,
      reason: "integration-kind-unregistered",
    });
    throw new Error(
      `Unknown integration kind ${integration.kind}. Did you forget to add it to the integration creator?`,
    );
  }

  const creator = await loadIntegrationCreatorAsync(integration.kind);
  return (await creator(integration)) as IntegrationInstanceOfKind<TKind>;
};
