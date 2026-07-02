import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { BazarrBadges } from "./bazarr-types";
import { bazarrBadgesSchema, bazarrSystemStatusSchema } from "./bazarr-types";

export class BazarrIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/system/status"), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    bazarrSystemStatusSchema.parse(await response.json());
    return { success: true };
  }

  public async getBadgesAsync(): Promise<BazarrBadges> {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/badges"), {
      headers: this.getAuthHeaders(),
      timeout: 10000,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Bazarr badges for ${this.integration.name} (${this.integration.id}): ${response.statusText}`,
      );
    }

    return bazarrBadgesSchema.parse(await response.json());
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      "X-API-KEY": this.getSecretValue("apiKey"),
      Accept: "application/json",
    };
  }
}
