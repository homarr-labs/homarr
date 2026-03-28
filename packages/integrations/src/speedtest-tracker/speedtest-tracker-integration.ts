import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import {
  speedtestTrackerLatestResultSchema,
  speedtestTrackerResultsCollectionSchema,
  speedtestTrackerStatsSchema,
} from "./speedtest-tracker-types";
import type {
  SpeedtestTrackerDashboardData,
  SpeedtestTrackerLatestResult,
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
      throw new ResponseError(response);
    }

    return { success: true };
  }

  /**
   * GET /api/v1/results/latest
   * Returns the most recent speedtest result.
   */
  public async getLatestResultAsync(): Promise<SpeedtestTrackerLatestResult | null> {
    const url = this.url("/api/v1/results/latest");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return speedtestTrackerLatestResultSchema.parse(((await response.json()) as { data: unknown }).data);
  }

  /**
   * GET /api/v1/stats
   * Returns aggregated speedtest statistics.
   */
  public async getStatsAsync(): Promise<SpeedtestTrackerStats | null> {
    const url = this.url("/api/v1/stats");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return speedtestTrackerStatsSchema.parse(((await response.json()) as { data: unknown }).data);
  }

  /**
   * GET /api/v1/results
   * Returns a paginated list of recent speedtest results.
   */
  public async getRecentResultsAsync(perPage = 10): Promise<SpeedtestTrackerResultsCollection> {
    const url = this.url("/api/v1/results", { result_count: String(perPage), sort: "-created_at" });
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return speedtestTrackerResultsCollectionSchema.parse(await response.json());
  }

  /**
   * Fetches latest result + stats + recent results in parallel.
   */
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

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
      Accept: "application/json",
    };
  }
}
