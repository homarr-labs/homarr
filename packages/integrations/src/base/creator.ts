import type { IntegrationKind } from "@homarr/definitions";

import { AdGuardHomeIntegration } from "../adguard-home/adguard-home-integration";
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
  jellyseerr: JellyseerrIntegration,
  overseerr: OverseerrIntegration,
} satisfies Partial<Record<IntegrationKind, new (integration: IntegrationInput) => Integration>>;
