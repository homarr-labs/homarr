import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { logger } from "@homarr/log";

import { Integration } from "../base/integration";
import { entityStateSchema } from "./homeassistant-types";

export class HomeAssistantIntegration extends Integration {
  public async getEntityStateAsync(entityId: string) {
    try {
      const response = await this.getAsync(`/api/states/${entityId}`);
      const body = await response.json();
      if (!response.ok) {
        logger.warn(`Response did not indicate success`);
        return {
          error: "Response did not indicate success",
        };
      }
      return entityStateSchema.safeParseAsync(body);
    } catch (err) {
      logger.error(`Failed to fetch from ${this.url("/")}: ${err as string}`);
      return {
        success: false as const,
        error: err,
      };
    }
  }

  public async triggerAutomationAsync(entityId: string) {
    try {
      const response = await this.postAsync("/api/services/automation/trigger", {
        entity_id: entityId,
      });

      return response.ok;
    } catch (err) {
      logger.error(`Failed to fetch from '${this.url("/")}': ${err as string}`);
      return false;
    }
  }

  /**
   * Triggers a toggle action for a specific entity.
   *
   * @param entityId - The ID of the entity to toggle.
   * @returns A boolean indicating whether the toggle action was successful.
   */
  public async triggerToggleAsync(entityId: string) {
    try {
      const response = await this.postAsync("/api/services/homeassistant/toggle", {
        entity_id: entityId,
      });

      return response.ok;
    } catch (err) {
      logger.error(`Failed to fetch from '${this.url("/")}': ${err as string}`);
      return false;
    }
  }

  public async testConnectionAsync(): Promise<void> {
    await super.handleTestConnectionResponseAsync({
      queryFunctionAsync: async () => {
        return await this.getAsync("/api/config");
      },
    });
  }

  /**
   * Makes a GET request to the Home Assistant API.
   * It includes the authorization header with the API key.
   * @param path full path to the API endpoint
   * @returns the response from the API
   */
  private async getAsync(path: `/api/${string}`) {
    return await fetchWithTrustedCertificatesAsync(this.url(path), {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Makes a POST request to the Home Assistant API.
   * It includes the authorization header with the API key.
   * @param path full path to the API endpoint
   * @param body the body of the request
   * @returns the response from the API
   */
  private async postAsync(path: `/api/${string}`, body: Record<string, string>) {
    return await fetchWithTrustedCertificatesAsync(this.url(path), {
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
      method: "POST",
    });
  }

  /**
   * Returns the headers required for authorization.
   * @returns the authorization headers
   */
  private getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
    };
  }
}
