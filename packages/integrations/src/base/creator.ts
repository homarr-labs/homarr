import type { IntegrationKind } from "@homarr/definitions";

import { AdGuardHomeIntegration } from "../adguard-home/adguard-home-integration";
import { BeszelIntegration } from "../beszel/beszel-integration";
import { AnchorIntegration } from "../anchor/anchor-integration";
import { AudiobookshelfIntegration } from "../audiobookshelf/audiobookshelf-integration";
import { CoolifyIntegration } from "../coolify/coolify-integration";
import { DashDotIntegration } from "../dashdot/dashdot-integration";
import { Aria2Integration } from "../download-client/aria2/aria2-integration";
import { DelugeIntegration } from "../download-client/deluge/deluge-integration";
import { NzbGetIntegration } from "../download-client/nzbget/nzbget-integration";
import { QBitTorrentIntegration } from "../download-client/qbittorrent/qbittorrent-integration";
import { SabnzbdIntegration } from "../download-client/sabnzbd/sabnzbd-integration";
import { SlskdIntegration } from "../download-client/slskd/slskd-integration";
import { TransmissionIntegration } from "../download-client/transmission/transmission-integration";
import { EmbyIntegration } from "../emby/emby-integration";
import { GlancesIntegration } from "../glances/glances-integration";
import { ArchiveTeamWarriorIntegration } from "../archive-team-warrior/archive-team-warrior-integration";
import { GluetunIntegration } from "../gluetun/gluetun-integration";
import { HomeAssistantIntegration } from "../homeassistant/homeassistant-integration";
import { ICalIntegration } from "../ical/ical-integration";
import { ImmichIntegration } from "../immich/immich-integration";
import { JellyfinIntegration } from "../jellyfin/jellyfin-integration";
import { JellyseerrIntegration } from "../jellyseerr/jellyseerr-integration";
import { LidarrIntegration } from "../media-organizer/lidarr/lidarr-integration";
import { RadarrIntegration } from "../media-organizer/radarr/radarr-integration";
import { ReadarrIntegration } from "../media-organizer/readarr/readarr-integration";
import { SonarrIntegration } from "../media-organizer/sonarr/sonarr-integration";
import { TdarrIntegration } from "../media-transcoding/tdarr-integration";
import { MockIntegration } from "../mock/mock-integration";
import { NavidromeIntegration } from "../navidrome/navidrome-integration";
import { NextcloudIntegration } from "../nextcloud/nextcloud.integration";
import { GotifyIntegration } from "../gotify/gotify-integration";
import { NTFYIntegration } from "../ntfy/ntfy-integration";
import { OpenMediaVaultIntegration } from "../openmediavault/openmediavault-integration";
import { OPNsenseIntegration } from "../opnsense/opnsense-integration";
import { OverseerrIntegration } from "../overseerr/overseerr-integration";
import { PaperlessNgxIntegration } from "../paperless-ngx/paperless-ngx-integration";
import { PeaNutIntegration } from "../peanut/peanut-integration";
import { createPiHoleIntegrationAsync } from "../pi-hole/pi-hole-integration-factory";
import { createTechnitiumDnsIntegrationAsync } from "../technitium/technitium-integration-factory";
import { PlexIntegration } from "../plex/plex-integration";
import { ProwlarrIntegration } from "../prowlarr/prowlarr-integration";
import { ProxmoxIntegration } from "../proxmox/proxmox-integration";
import { SeerrIntegration } from "../seerr/seerr-integration";
import { SpeedtestTrackerIntegration } from "../speedtest-tracker/speedtest-tracker-integration";
import { TracearrIntegration } from "../tracearr/tracearr-integration";
import { SynologyIntegration } from "../synology/synology-integration";
import { TrueNasIntegration } from "../truenas/truenas-integration";
import { UmamiIntegration } from "../umami/umami-integration";
import { UptimeKumaIntegration } from "../uptime-kuma/uptime-kuma-integration";
import { UnifiControllerIntegration } from "../unifi-controller/unifi-controller-integration";
import { UnraidIntegration } from "../unraid/unraid-integration";
import type { Integration, IntegrationInput } from "./integration";

export const createIntegrationAsync = async <TKind extends keyof typeof integrationCreators>(
  integration: IntegrationInput & { kind: TKind },
): Promise<IntegrationInstanceByKind[TKind]> => {
  if (!(integration.kind in integrationCreators)) {
    throw new Error(
      `Unknown integration kind ${integration.kind}. Did you forget to add it to the integration creator?`,
    );
  }

  return (await integrationCreators[integration.kind].create(integration)) as IntegrationInstanceByKind[TKind];
};

type IntegrationConstructor<TIntegration extends Integration = Integration> = new (
  integration: IntegrationInput,
) => TIntegration;
type IntegrationFactory<TIntegration extends Integration = Integration> = (
  input: IntegrationInput,
) => Promise<TIntegration>;
type IntegrationCreator<TIntegration extends Integration = Integration> = {
  create: (input: IntegrationInput) => TIntegration | Promise<TIntegration>;
};

const fromClass = <TIntegration extends Integration>(Constructor: IntegrationConstructor<TIntegration>) => ({
  create: (input: IntegrationInput) => new Constructor(input),
});

const fromFactory = <TIntegration extends Integration>(create: IntegrationFactory<TIntegration>) => ({ create });

export const integrationCreators = {
  anchor: fromClass(AnchorIntegration),
  piHole: fromFactory(createPiHoleIntegrationAsync),
  adGuardHome: fromClass(AdGuardHomeIntegration),
  technitiumDns: fromFactory(createTechnitiumDnsIntegrationAsync),
  homeAssistant: fromClass(HomeAssistantIntegration),
  jellyfin: fromClass(JellyfinIntegration),
  plex: fromClass(PlexIntegration),
  sonarr: fromClass(SonarrIntegration),
  radarr: fromClass(RadarrIntegration),
  sabNzbd: fromClass(SabnzbdIntegration),
  nzbGet: fromClass(NzbGetIntegration),
  qBittorrent: fromClass(QBitTorrentIntegration),
  deluge: fromClass(DelugeIntegration),
  transmission: fromClass(TransmissionIntegration),
  slskd: fromClass(SlskdIntegration),
  aria2: fromClass(Aria2Integration),
  jellyseerr: fromClass(JellyseerrIntegration),
  seerr: fromClass(SeerrIntegration),
  overseerr: fromClass(OverseerrIntegration),
  prowlarr: fromClass(ProwlarrIntegration),
  openmediavault: fromClass(OpenMediaVaultIntegration),
  lidarr: fromClass(LidarrIntegration),
  readarr: fromClass(ReadarrIntegration),
  dashDot: fromClass(DashDotIntegration),
  tdarr: fromClass(TdarrIntegration),
  proxmox: fromClass(ProxmoxIntegration),
  emby: fromClass(EmbyIntegration),
  nextcloud: fromClass(NextcloudIntegration),
  unifiController: fromClass(UnifiControllerIntegration),
  opnsense: fromClass(OPNsenseIntegration),
  ical: fromClass(ICalIntegration),
  ntfy: fromClass(NTFYIntegration),
  gotify: fromClass(GotifyIntegration),
  mock: fromClass(MockIntegration),
  truenas: fromClass(TrueNasIntegration),
  synology: fromClass(SynologyIntegration),
  unraid: fromClass(UnraidIntegration),
  coolify: fromClass(CoolifyIntegration),
  tracearr: fromClass(TracearrIntegration),
  glances: fromClass(GlancesIntegration),
  immich: fromClass(ImmichIntegration),
  paperlessNgx: fromClass(PaperlessNgxIntegration),
  speedtestTracker: fromClass(SpeedtestTrackerIntegration),
  audiobookshelf: fromClass(AudiobookshelfIntegration),
  navidrome: fromClass(NavidromeIntegration),
  umami: fromClass(UmamiIntegration),
  gluetun: fromClass(GluetunIntegration),
  archiveTeamWarrior: fromClass(ArchiveTeamWarriorIntegration),
  uptimeKuma: fromClass(UptimeKumaIntegration),
  peaNut: fromClass(PeaNutIntegration),
  beszel: fromClass(BeszelIntegration),
} satisfies Record<IntegrationKind, IntegrationCreator>;

type IntegrationInstanceByKind = {
  [TKind in keyof typeof integrationCreators]: Awaited<ReturnType<(typeof integrationCreators)[TKind]["create"]>>;
};
