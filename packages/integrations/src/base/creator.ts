import type { IntegrationKind } from "@homarr/definitions";

import { AdGuardHomeIntegration } from "../adguard-home/adguard-home-integration";
import { DelugeIntegration } from "../download-client/deluge/deluge-integration";
import { NzbGetIntegration } from "../download-client/nzbget/nzbget-integration";
import { QBitTorrentIntegration } from "../download-client/qbittorrent/qbittorrent-integration";
import { SabnzbdIntegration } from "../download-client/sabnzbd/sabnzbd-integration";
import { TransmissionIntegration } from "../download-client/transmission/transmission-integration";
import { HomeAssistantIntegration } from "../homeassistant/homeassistant-integration";
import { JellyfinIntegration } from "../jellyfin/jellyfin-integration";
import { SonarrIntegration } from "../media-organizer/sonarr/sonarr-integration";
import { PiHoleIntegration } from "../pi-hole/pi-hole-integration";
import type { IntegrationInput } from "./integration";

export const integrationCreatorByKind = (kind: IntegrationKind, integration: IntegrationInput) => {
  switch (kind) {
    case "piHole":
      return new PiHoleIntegration(integration);
    case "adGuardHome":
      return new AdGuardHomeIntegration(integration);
    case "homeAssistant":
      return new HomeAssistantIntegration(integration);
    case "jellyfin":
      return new JellyfinIntegration(integration);
    case "sonarr":
      return new SonarrIntegration(integration);
    case "sabNzbd":
      return new SabnzbdIntegration(integration);
    case "nzbGet":
      return new NzbGetIntegration(integration);
    case "qBittorrent":
      return new QBitTorrentIntegration(integration);
    case "deluge":
      return new DelugeIntegration(integration);
    case "transmission":
      return new TransmissionIntegration(integration);
    default:
      throw new Error(`Unknown integration kind ${kind}. Did you forget to add it to the integration creator?`);
  }
};
