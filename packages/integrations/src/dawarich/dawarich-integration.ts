import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { ResponseError } from "@homarr/common/server";
import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { dawarichPlacesSchema, dawarichStatisticsSchema } from "./dawarich-schemas";
import type { z } from "zod/v4";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import { TestConnectionError } from "../base/test-connection/test-connection-error";

export class DawarichIntegration extends Integration {
  constructor(integration: IntegrationInput) {
    super(integration);
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await fetchWithTrustedCertificatesAsync(this.url(`/api/v1/users/me`), {
      headers: { Authorization: `Bearer ${this.getSecretValue("apiKey")}` },
    });

    if (response.status === 200) {
      return { success: true };
    }

    return TestConnectionError.StatusResult(response);
  }

  async getStatisticsAsync(): Promise<{
    totalDistanceKm: number;
    totalPointsTracked: number;
    totalReverseGeocodedPoints: number;
    totalCountriesVisited: number;
    totalCitiesVisited: number;
  }> {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/v1/stats"), {
      headers: { Authorization: `Bearer ${this.getSecretValue("apiKey")}` },
    });

    if (!response.ok) throw new ResponseError(response);

    return dawarichStatisticsSchema.parseAsync(await response.json());
  }

  async getPlacesAsync(): Promise<z.infer<typeof dawarichPlacesSchema>> {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/v1/places"), {
      headers: { Authorization: `Bearer ${this.getSecretValue("apiKey")}` },
    });

    if (!response.ok) throw new ResponseError(response);

    return dawarichPlacesSchema.parseAsync(await response.json());
  }
}
