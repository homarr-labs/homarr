import type { IntegrationKind } from "@homarr/definitions";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import {
  withHttpAuthentication,
  apiKeyAuth,
  bearerAuth,
  basicAuth,
  headerAuth,
  queryAuth,
  noAuth,
  optionalAuth,
  alternativeAuth,
  rpcAuth,
  feedAuth,
  secret,
  clientAuthentication,
} from "../http-auth";
import type { IntegrationHttpAuthentication } from "../http-auth";
import type { Integration, IntegrationInput } from "./integration";

const logger = createLogger({ module: "integrationFactory" });

// Keep each import path explicit so Node and Turbopack can discover every lazy integration chunk.
const integrationCreators = {
  anchor: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../anchor/anchor-integration")).AnchorIntegration(input),
    bearerAuth,
  ),
  piHole: withHttpAuthentication(
    async (input: IntegrationInput) =>
      (await import("../pi-hole/pi-hole-integration-factory")).createPiHoleIntegrationAsync(input),
    clientAuthentication,
  ),
  adGuardHome: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../adguard-home/adguard-home-integration")).AdGuardHomeIntegration(input),
    basicAuth(),
  ),
  technitiumDns: withHttpAuthentication(
    async (input: IntegrationInput) =>
      (await import("../technitium/technitium-integration-factory")).createTechnitiumDnsIntegrationAsync(input),
    clientAuthentication,
  ),
  homeAssistant: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../homeassistant/homeassistant-integration")).HomeAssistantIntegration(input),
    bearerAuth,
  ),
  jellyfin: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../jellyfin/jellyfin-integration")).JellyfinIntegration(input),
    clientAuthentication,
  ),
  plex: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../plex/plex-integration")).PlexIntegration(input),
    headerAuth("X-Plex-Token"),
  ),
  sonarr: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../media-organizer/sonarr/sonarr-integration")).SonarrIntegration(input),
    apiKeyAuth,
  ),
  radarr: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../media-organizer/radarr/radarr-integration")).RadarrIntegration(input),
    apiKeyAuth,
  ),
  sabNzbd: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../download-client/sabnzbd/sabnzbd-integration")).SabnzbdIntegration(input),
    queryAuth("apikey"),
  ),
  nzbGet: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../download-client/nzbget/nzbget-integration")).NzbGetIntegration(input),
    basicAuth(),
  ),
  qBittorrent: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../download-client/qbittorrent/qbittorrent-integration")).QBitTorrentIntegration(input),
    clientAuthentication,
  ),
  deluge: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../download-client/deluge/deluge-integration")).DelugeIntegration(input),
    clientAuthentication,
  ),
  transmission: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../download-client/transmission/transmission-integration")).TransmissionIntegration(input),
    clientAuthentication,
  ),
  slskd: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../download-client/slskd/slskd-integration")).SlskdIntegration(input),
    apiKeyAuth,
  ),
  aria2: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../download-client/aria2/aria2-integration")).Aria2Integration(input),
    optionalAuth(rpcAuth),
  ),
  jellyseerr: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../jellyseerr/jellyseerr-integration")).JellyseerrIntegration(input),
    apiKeyAuth,
  ),
  seerr: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../seerr/seerr-integration")).SeerrIntegration(input),
    apiKeyAuth,
  ),
  overseerr: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../overseerr/overseerr-integration")).OverseerrIntegration(input),
    apiKeyAuth,
  ),
  prowlarr: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../prowlarr/prowlarr-integration")).ProwlarrIntegration(input),
    apiKeyAuth,
  ),
  openmediavault: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../openmediavault/openmediavault-integration")).OpenMediaVaultIntegration(input),
    clientAuthentication,
  ),
  lidarr: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../media-organizer/lidarr/lidarr-integration")).LidarrIntegration(input),
    apiKeyAuth,
  ),
  readarr: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../media-organizer/readarr/readarr-integration")).ReadarrIntegration(input),
    apiKeyAuth,
  ),
  dashDot: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../dashdot/dashdot-integration")).DashDotIntegration(input),
    noAuth,
  ),
  tdarr: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../media-transcoding/tdarr-integration")).TdarrIntegration(input),
    optionalAuth(apiKeyAuth),
  ),
  proxmox: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../proxmox/proxmox-integration")).ProxmoxIntegration(input),
    (input) => ({
      headers: {
        Authorization: `PVEAPIToken=${secret(input, "username")}@${secret(input, "realm")}!${secret(input, "tokenId")}=${secret(input, "apiKey")}`,
      },
    }),
  ),
  emby: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../emby/emby-integration")).EmbyIntegration(input),
    headerAuth("X-Emby-Token"),
  ),
  nextcloud: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../nextcloud/nextcloud.integration")).NextcloudIntegration(input),
    basicAuth("username", "password", { "OCS-APIRequest": "true" }),
  ),
  unifiController: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../unifi-controller/unifi-controller-integration")).UnifiControllerIntegration(input),
    clientAuthentication,
  ),
  opnsense: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../opnsense/opnsense-integration")).OPNsenseIntegration(input),
    basicAuth("opnsenseApiKey", "opnsenseApiSecret"),
  ),
  ical: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../ical/ical-integration")).ICalIntegration(input),
    feedAuth,
  ),
  ntfy: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../ntfy/ntfy-integration")).NTFYIntegration(input),
    optionalAuth(bearerAuth),
  ),
  gotify: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../gotify/gotify-integration")).GotifyIntegration(input),
    basicAuth(),
  ),
  mock: async (input: IntegrationInput) => new (await import("../mock/mock-integration")).MockIntegration(input),
  truenas: async (input: IntegrationInput) =>
    new (await import("../truenas/truenas-integration")).TrueNasIntegration(input),
  synology: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../synology/synology-integration")).SynologyIntegration(input),
    clientAuthentication,
  ),
  unraid: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../unraid/unraid-integration")).UnraidIntegration(input),
    apiKeyAuth,
  ),
  coolify: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../coolify/coolify-integration")).CoolifyIntegration(input),
    bearerAuth,
  ),
  tracearr: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../tracearr/tracearr-integration")).TracearrIntegration(input),
    bearerAuth,
  ),
  glances: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../glances/glances-integration")).GlancesIntegration(input),
    noAuth,
  ),
  immich: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../immich/immich-integration")).ImmichIntegration(input),
    apiKeyAuth,
  ),
  paperlessNgx: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../paperless-ngx/paperless-ngx-integration")).PaperlessNgxIntegration(input),
    headerAuth("Authorization", "Token "),
  ),
  patchmon: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../patchmon/patchmon-integration")).PatchMonIntegration(input),
    basicAuth("patchmonApiKey", "patchmonApiSecret"),
  ),
  speedtestTracker: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../speedtest-tracker/speedtest-tracker-integration")).SpeedtestTrackerIntegration(input),
    bearerAuth,
  ),
  audiobookshelf: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../audiobookshelf/audiobookshelf-integration")).AudiobookshelfIntegration(input),
    bearerAuth,
  ),
  navidrome: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../navidrome/navidrome-integration")).NavidromeIntegration(input),
    clientAuthentication,
  ),
  umami: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../umami/umami-integration")).UmamiIntegration(input),
    clientAuthentication,
  ),
  gluetun: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../gluetun/gluetun-integration")).GluetunIntegration(input),
    alternativeAuth(apiKeyAuth),
  ),
  archiveTeamWarrior: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../archive-team-warrior/archive-team-warrior-integration")).ArchiveTeamWarriorIntegration(
        input,
      ),
    optionalAuth(basicAuth(), ["username", "password"]),
  ),
  uptimeKuma: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../uptime-kuma/uptime-kuma-integration")).UptimeKumaIntegration(input),
    noAuth,
  ),
  peaNut: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../peanut/peanut-integration")).PeaNutIntegration(input),
    optionalAuth(basicAuth(), ["username", "password"]),
  ),
  beszel: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../beszel/beszel-integration")).BeszelIntegration(input),
    clientAuthentication,
  ),
  bazarr: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../bazarr/bazarr-integration")).BazarrIntegration(input),
    apiKeyAuth,
  ),
  traefik: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../traefik/traefik-integration")).TraefikIntegration(input),
    clientAuthentication,
  ),
  wud: withHttpAuthentication(
    async (input: IntegrationInput) => new (await import("../wud/wud-integration")).WudIntegration(input),
    optionalAuth(basicAuth(), ["username", "password"]),
  ),
  llamacpp: withHttpAuthentication(
    async (input: IntegrationInput) =>
      new (await import("../llama-cpp/llamacpp-integration")).LlamacppIntegration(input),
    noAuth,
  ),
} satisfies {
  [Kind in IntegrationKind]: ((input: IntegrationInput) => Promise<Integration>) &
    (Kind extends "truenas" | "mock"
      ? unknown
      : {
          authenticate(input: IntegrationInput): IntegrationHttpAuthentication | Promise<IntegrationHttpAuthentication>;
        });
};

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

export async function getIntegrationHttpAuthenticationAsync(
  integration: IntegrationInput & { kind: IntegrationKind },
): Promise<IntegrationHttpAuthentication> {
  const creator = integrationCreators[integration.kind];
  if (!("authenticate" in creator)) throw new Error("This integration does not use HTTP");
  return creator.authenticate(integration);
}
