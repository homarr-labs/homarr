import type { IntegrationKind } from "@homarr/definitions";

import { AdGuardHomeIntegration } from "../adguard-home/adguard-home-integration";
import { DelugeIntegration } from "../download-client/deluge/deluge-integration";
import { NzbGetIntegration } from "../download-client/nzbget/nzbget-integration";
import { QBitTorrentIntegration } from "../download-client/qbittorrent/qbittorrent-integration";
import { SabnzbdIntegration } from "../download-client/sabnzbd/sabnzbd-integration";
import { TransmissionIntegration } from "../download-client/transmission/transmission-integration";
import { HomeAssistantIntegration } from "../homeassistant/homeassistant-integration";
import { JellyfinIntegration } from "../jellyfin/jellyfin-integration";
import { JellyseerrIntegration } from "../jellyseerr/jellyseerr-integration";
import { RadarrIntegration } from "../media-organizer/radarr/radarr-integration";
import { SonarrIntegration } from "../media-organizer/sonarr/sonarr-integration";
import { OverseerrIntegration } from "../overseerr/overseerr-integration";
import { PiHoleIntegration } from "../pi-hole/pi-hole-integration";
import type { Integration, IntegrationInput } from "./integration";

export const integrationCreatorByKind = <TKind extends keyof typeof integrationCreators>(
  kind: TKind,
  integration: IntegrationInput,
) => {
  if (!(kind in integrationCreators)) {
    throw new Error(`Unknown integration kind ${kind}. Did you forget to add it to the integration creator?`);
  }

  return new integrationCreators[kind](integration) as InstanceType<(typeof integrationCreators)[TKind]>;
};

export const integrationCreators = {
  piHole: PiHoleIntegration,
  adGuardHome: AdGuardHomeIntegration,
  homeAssistant: HomeAssistantIntegration,
  jellyfin: JellyfinIntegration,
  sonarr: SonarrIntegration,
  radarr: RadarrIntegration,
  sabNzbd: SabnzbdIntegration,
  nzbGet: NzbGetIntegration,
  qBittorrent: QBitTorrentIntegration,
  deluge: DelugeIntegration,
  transmission: TransmissionIntegration,
  jellyseerr: JellyseerrIntegration,
  overseerr: OverseerrIntegration,
} satisfies Partial<Record<IntegrationKind, new (integration: IntegrationInput) => Integration>>;
