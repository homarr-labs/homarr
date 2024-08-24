import type { IntegrationKind } from "@homarr/definitions";

import { AdGuardHomeIntegration } from "../adguard-home/adguard-home-integration";
import { HomeAssistantIntegration } from "../homeassistant/homeassistant-integration";
import { JellyfinIntegration } from "../jellyfin/jellyfin-integration";
import { JellyseerrIntegration } from "../jellyseerr/jellyseerr-integration";
import { SonarrIntegration } from "../media-organizer/sonarr/sonarr-integration";
import { OverseerrIntegration } from "../overseerr/overseerr-integration";
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
    case "jellyseerr":
      return new JellyseerrIntegration(integration);
    case "overseerr":
      return new OverseerrIntegration(integration);
    default:
      throw new Error(`Unknown integration kind ${kind}. Did you forget to add it to the integration creator?`);
  }
};
