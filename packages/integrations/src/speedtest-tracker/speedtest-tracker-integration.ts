import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import {
  speedtestTrackerLatestResultEnvelopeSchema,
  speedtestTrackerResultsCollectionSchema,
  speedtestTrackerStatsEnvelopeSchema,
} from "./speedtest-tracker-types";
import type {
  SpeedtestTrackerDashboardData,
  SpeedtestTrackerResult,
  SpeedtestTrackerResultsCollection,
  SpeedtestTrackerStats,
} from "./speedtest-tracker-types";

export class SpeedtestTrackerIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const url = this.url("/api/v1/results/latest");
    const response = await input.fetchAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    return { success: true };
  }

  public async getLatestResultAsync(): Promise<SpeedtestTrackerResult | null> {
    const response = await this.getAsync("/api/v1/results/latest");

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return speedtestTrackerLatestResultEnvelopeSchema.parse(await response.json()).data;
  }

  public async getStatsAsync(): Promise<SpeedtestTrackerStats | null> {
    const response = await this.getAsync("/api/v1/stats");

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return speedtestTrackerStatsEnvelopeSchema.parse(await response.json()).data;
  }

  public async getRecentResultsAsync(perPage = 10): Promise<SpeedtestTrackerResultsCollection> {
    const response = await this.getAsync("/api/v1/results", {
      result_count: String(perPage),
      sort: "-created_at",
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return speedtestTrackerResultsCollectionSchema.parse(await response.json());
  }

  public async getDashboardDataAsync(): Promise<SpeedtestTrackerDashboardData> {
    const [latestResult, stats, recentCollection] = await Promise.all([
      this.getLatestResultAsync(),
      this.getStatsAsync(),
      this.getRecentResultsAsync(30),
    ]);

    return {
      latestResult,
      stats,
      recentResults: recentCollection.data,
    };
  }

  private async getAsync(path: `/api/v1/${string}`, queryParams?: Record<string, string>) {
    return await fetchWithTrustedCertificatesAsync(this.url(path, queryParams), {
      headers: this.getAuthHeaders(),
    });
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
      Accept: "application/json",
    };
  }
}
