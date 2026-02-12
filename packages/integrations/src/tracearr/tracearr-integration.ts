import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type {
  TracearrDashboardData,
  TracearrHealthResponse,
  TracearrStatsResponse,
  TracearrStreamsResponse,
} from "./tracearr-types";

export class TracearrIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const healthUrl = this.url("/api/v1/public/health");
    const healthResponse = await input.fetchAsync(healthUrl, {
      headers: this.getAuthHeaders(),
    });

    if (!healthResponse.ok) {
      throw new ResponseError(healthResponse);
    }

    return { success: true };
  }

  /**
   * GET /api/v1/public/health
   * Check server connectivity and status
   */
  public async getHealthAsync(): Promise<TracearrHealthResponse> {
    const url = this.url("/api/v1/public/health");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return (await response.json()) as TracearrHealthResponse;
  }

  /**
   * GET /api/v1/public/stats
   * Dashboard statistics with optional server filter
   */
  public async getStatsAsync(serverId?: string): Promise<TracearrStatsResponse> {
    const queryParams: Record<string, string> = {};
    if (serverId) {
      queryParams.serverId = serverId;
    }

    const url = this.url("/api/v1/public/stats", queryParams);
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return (await response.json()) as TracearrStatsResponse;
  }

  /**
   * GET /api/v1/public/streams
   * Active playback sessions with codec and quality details
   */
  public async getStreamsAsync(serverId?: string): Promise<TracearrStreamsResponse> {
    const queryParams: Record<string, string> = {};
    if (serverId) {
      queryParams.serverId = serverId;
    }

    const url = this.url("/api/v1/public/streams", queryParams);
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return (await response.json()) as TracearrStreamsResponse;
  }

  /**
   * Get combined dashboard data (stats + streams)
   */
  public async getDashboardDataAsync(): Promise<TracearrDashboardData> {
    const [stats, streams] = await Promise.all([this.getStatsAsync(), this.getStreamsAsync()]);

    return { stats, streams };
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
    };
  }
}
