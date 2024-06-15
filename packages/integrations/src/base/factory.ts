import type { IntegrationKind } from "@homarr/definitions";

import { HomeAssistantIntegration } from "../homeassistant/homeassistant-integration";
import { PiHoleIntegration } from "../pi-hole/pi-hole-integration";
import type { IntegrationInput } from "./integration";

export const integrationFactory = (kind: IntegrationKind, integration: IntegrationInput) => {
  switch (kind) {
    case "piHole":
      return new PiHoleIntegration(integration);
    case "homeAssistant":
      return new HomeAssistantIntegration(integration);
    default:
      throw new Error(`Unknown integration kind ${kind}`);
  }
};
