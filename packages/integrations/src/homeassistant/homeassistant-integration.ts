import { appendPath } from "@homarr/common";
import { logger } from "@homarr/log";

import { Integration } from "../base/integration";
import { entityStateSchema } from "./homeassistant-types";

export class HomeAssistantIntegration extends Integration {
  async getEntityStateAsync(entityId: string) {
    try {
      const response = await fetch(appendPath(this.integration.url, `/states/${entityId}`), {
        headers: {
          Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
        },
      });
      const body = (await response.json()) as unknown;
      if (!response.ok) {
        logger.warn(`Response did not indicate success`);
        return {
          error: "Response did not indicate success",
        };
      }
      return entityStateSchema.safeParseAsync(body);
    } catch (err) {
      logger.error(`Failed to fetch from ${this.integration.url}: ${err as string}`);
      return {
        success: false as const,
        error: err,
      };
    }
  }

  async triggerAutomationAsync(entityId: string) {
    try {
      const response = await fetch(appendPath(this.integration.url, "/services/automation/trigger"), {
        headers: {
          Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
        },
        body: JSON.stringify({
          entity_id: entityId,
        }),
        method: "POST",
      });
      return response.ok;
    } catch (err) {
      logger.error(`Failed to fetch from '${this.integration.url}': ${err as string}`);
      return false;
    }
  }

  /**
   * Triggers a toggle action for a specific entity.
   *
   * @param entityId - The ID of the entity to toggle.
   * @returns A boolean indicating whether the toggle action was successful.
   */
  async triggerToggleAsync(entityId: string) {
    try {
      const response = await fetch(appendPath(this.integration.url, "/services/homeassistant/toggle"), {
        headers: {
          Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
        },
        body: JSON.stringify({
          entity_id: entityId,
        }),
        method: "POST",
      });
      return response.ok;
    } catch (err) {
      logger.error(`Failed to fetch from '${this.integration.url}': ${err as string}`);
      return false;
    }
  }
}
