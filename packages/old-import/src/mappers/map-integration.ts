import { decryptSecretWithKey } from "@homarr/common/server";
import { createId } from "@homarr/db";
import type { IntegrationKind } from "@homarr/definitions";
import type { OldmarrIntegrationType } from "@homarr/old-schema";

import type { PreparedIntegration } from "../prepare/prepare-integrations";

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
  tdarr: "tdarr",
  transmission: "transmission",
  plex: "plex",
};

export const mapAndDecryptIntegrations = (
  preparedIntegrations: PreparedIntegration[],
  encryptionToken: string | null,
) => {
  if (encryptionToken === null) {
    return [];
  }

  const key = Buffer.from(encryptionToken, "hex");

  return preparedIntegrations.map(({ type, name, url, properties }) => ({
    id: createId(),
    name,
    url,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    kind: mapIntegrationType(type!),
    secrets: properties.map((property) => ({
      ...property,
      value: property.value ? decryptSecretWithKey(property.value as `${string}.${string}`, key) : null,
    })),
  }));
};
