import type { IntegrationKind } from "@homarr/definitions";
import type { OldmarrIntegrationType } from "@homarr/old-schema";

export const mapIntegrationType = (type: OldmarrIntegrationType) => {
  const kind = mapping[type];
  if (!kind) {
    throw new Error(`Integration type ${type} is not supported yet`);
  }
  return kind;
};

const mapping: Record<OldmarrIntegrationType, IntegrationKind | null> = {
  adGuardHome: "adGuardHome",
  deluge: "deluge",
  homeAssistant: "homeAssistant",
  jellyfin: "jellyfin",
  jellyseerr: "jellyseerr",
  lidarr: "lidarr",
  nzbGet: "nzbGet",
  openmediavault: "openmediavault",
  overseerr: "overseerr",
  pihole: "piHole",
  prowlarr: "prowlarr",
  proxmox: null,
  qBittorrent: "qBittorrent",
  radarr: "radarr",
  readarr: "readarr",
  sabnzbd: "sabNzbd",
  sonarr: "sonarr",
  tdarr: null,
  transmission: "transmission",
  plex: "plex",
};
