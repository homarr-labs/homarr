import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import {
  speedtestTrackerEnvelopeSchema,
  speedtestTrackerLatestResultSchema,
  speedtestTrackerResultsCollectionSchema,
  speedtestTrackerStatsSchema,
} from "./speedtest-tracker-types";
import type {
  SpeedtestTrackerDashboardData,
  SpeedtestTrackerLatestResult,
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

  /**
   * GET /api/v1/results/latest
   * Returns the most recent speedtest result.
   */
  public async getLatestResultAsync(): Promise<SpeedtestTrackerLatestResult | null> {
    const response = await this.getAsync("/api/v1/results/latest");

    if (response.status === 404) {
      // Speedtest Tracker returns 404 when no tests have been run yet (fresh install)
      return null;
    }

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const envelope = speedtestTrackerEnvelopeSchema.parse(await response.json());
    return speedtestTrackerLatestResultSchema.parse(envelope.data);
  }

  /**
   * GET /api/v1/stats
   * Returns aggregated speedtest statistics.
   */
  public async getStatsAsync(): Promise<SpeedtestTrackerStats | null> {
    const response = await this.getAsync("/api/v1/stats");

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const envelope = speedtestTrackerEnvelopeSchema.parse(await response.json());
    return speedtestTrackerStatsSchema.parse(envelope.data);
  }

  /**
   * GET /api/v1/results
   * Returns a paginated list of recent speedtest results.
   */
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

  /**
   * Shared GET helper: builds the URL and attaches auth headers.
   * Mirrors the pattern used by other integrations (e.g. homeassistant).
   * Callers are responsible for checking response.ok and throwing as needed.
   */
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
