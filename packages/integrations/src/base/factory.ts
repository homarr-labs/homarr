import type { IntegrationKind } from "@homarr/definitions";

import { PiHoleIntegration } from "../pi-hole/pi-hole-integration";
import type { IntegrationInput } from "./integration";

export const integrationFactory = (kind: IntegrationKind, integration: IntegrationInput) => {
  switch (kind) {
    case "piHole":
      return new PiHoleIntegration(integration);
    default:
      throw new Error(`Unknown integration kind ${kind}`);
  }
};
