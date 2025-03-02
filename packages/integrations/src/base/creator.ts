import { decryptSecret } from "@homarr/common/server";
import type { Modify } from "@homarr/common/types";
import type { Integration as DbIntegration } from "@homarr/db/schema";
import type { IntegrationKind, IntegrationSecretKind } from "@homarr/definitions";

import { AdGuardHomeIntegration } from "../adguard-home/adguard-home-integration";
import { DashDotIntegration } from "../dashdot/dashdot-integration";
import { DelugeIntegration } from "../download-client/deluge/deluge-integration";
import { NzbGetIntegration } from "../download-client/nzbget/nzbget-integration";
import { QBitTorrentIntegration } from "../download-client/qbittorrent/qbittorrent-integration";
import { SabnzbdIntegration } from "../download-client/sabnzbd/sabnzbd-integration";
import { TransmissionIntegration } from "../download-client/transmission/transmission-integration";
import { EmbyIntegration } from "../emby/emby-integration";
import { HomeAssistantIntegration } from "../homeassistant/homeassistant-integration";
import { JellyfinIntegration } from "../jellyfin/jellyfin-integration";
import { JellyseerrIntegration } from "../jellyseerr/jellyseerr-integration";
import { LidarrIntegration } from "../media-organizer/lidarr/lidarr-integration";
import { RadarrIntegration } from "../media-organizer/radarr/radarr-integration";
import { ReadarrIntegration } from "../media-organizer/readarr/readarr-integration";
import { SonarrIntegration } from "../media-organizer/sonarr/sonarr-integration";
import { TdarrIntegration } from "../media-transcoding/tdarr-integration";
import { OpenMediaVaultIntegration } from "../openmediavault/openmediavault-integration";
import { OverseerrIntegration } from "../overseerr/overseerr-integration";
import { PiHoleIntegration } from "../pi-hole/pi-hole-integration";
import { PlexIntegration } from "../plex/plex-integration";
import { ProwlarrIntegration } from "../prowlarr/prowlarr-integration";
import { ProxmoxIntegration } from "../proxmox/proxmox-integration";
import type { Integration, IntegrationInput } from "./integration";

export const integrationCreator = <TKind extends keyof typeof integrationCreators>(
  integration: IntegrationInput & { kind: TKind },
) => {
  if (!(integration.kind in integrationCreators)) {
    throw new Error(
      `Unknown integration kind ${integration.kind}. Did you forget to add it to the integration creator?`,
    );
  }

  return new integrationCreators[integration.kind](integration) as InstanceType<(typeof integrationCreators)[TKind]>;
};

export const integrationCreatorFromSecrets = <TKind extends keyof typeof integrationCreators>(
  integration: Modify<DbIntegration, { kind: TKind }> & {
    secrets: { kind: IntegrationSecretKind; value: `${string}.${string}` }[];
  },
) => {
  return integrationCreator({
    ...integration,
    decryptedSecrets: integration.secrets.map((secret) => ({
      ...secret,
      value: decryptSecret(secret.value),
    })),
  });
};

export const integrationCreators = {
  piHole: PiHoleIntegration,
  adGuardHome: AdGuardHomeIntegration,
  homeAssistant: HomeAssistantIntegration,
  jellyfin: JellyfinIntegration,
  plex: PlexIntegration,
  sonarr: SonarrIntegration,
  radarr: RadarrIntegration,
  sabNzbd: SabnzbdIntegration,
  nzbGet: NzbGetIntegration,
  qBittorrent: QBitTorrentIntegration,
  deluge: DelugeIntegration,
  transmission: TransmissionIntegration,
  jellyseerr: JellyseerrIntegration,
  overseerr: OverseerrIntegration,
  prowlarr: ProwlarrIntegration,
  openmediavault: OpenMediaVaultIntegration,
  lidarr: LidarrIntegration,
  readarr: ReadarrIntegration,
  dashDot: DashDotIntegration,
  tdarr: TdarrIntegration,
  proxmox: ProxmoxIntegration,
  emby: EmbyIntegration,
} satisfies Record<IntegrationKind, new (integration: IntegrationInput) => Integration>;
