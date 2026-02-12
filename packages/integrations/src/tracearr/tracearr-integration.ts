import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { ImageProxy } from "@homarr/image-proxy";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type {
  TracearrDashboardData,
  TracearrHealthResponse,
  TracearrHistoryResponse,
  TracearrStatsResponse,
  TracearrStreamsResponse,
  TracearrViolationsResponse,
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

    const json = (await response.json()) as TracearrStreamsResponse;
    const imageProxy = new ImageProxy();

    await Promise.all(
      json.data.map(async (stream) => {
        if (stream.userAvatarUrl) {
          stream.userAvatarUrl = await this.proxyImageAsync(imageProxy, stream.userAvatarUrl, stream.id, "avatar");
        }
        if (stream.posterUrl) {
          stream.posterUrl = await this.proxyImageAsync(imageProxy, stream.posterUrl, stream.id, "poster");
        }
      }),
    );

    return json;
  }

  /**
   * GET /api/v1/public/violations
   * Recent rule violations with optional pagination
   */
  public async getViolationsAsync(pageSize = 5): Promise<TracearrViolationsResponse> {
    const url = this.url("/api/v1/public/violations", {
      page: "1",
      pageSize: String(pageSize),
    });
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const json = (await response.json()) as TracearrViolationsResponse;
    const imageProxy = new ImageProxy();

    await Promise.all(
      json.data.map(async (violation) => {
        if (violation.user.avatarUrl) {
          violation.user = { ...violation.user };
          violation.user.avatarUrl = await this.proxyImageAsync(
            imageProxy,
            violation.user.avatarUrl,
            violation.user.id,
            "avatar",
          );
        }
      }),
    );

    return json;
  }

  /**
   * GET /api/v1/public/history
   * Session history with optional pagination
   */
  public async getHistoryAsync(pageSize = 10): Promise<TracearrHistoryResponse> {
    const url = this.url("/api/v1/public/history", {
      page: "1",
      pageSize: String(pageSize),
    });
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const json = (await response.json()) as TracearrHistoryResponse;
    const imageProxy = new ImageProxy();

    await Promise.all(
      json.data.map(async (session) => {
        if (session.user.avatarUrl) {
          session.user = { ...session.user };
          session.user.avatarUrl = await this.proxyImageAsync(
            imageProxy,
            session.user.avatarUrl,
            session.user.id,
            "avatar",
          );
        }
      }),
    );

    return json;
  }

  /**
   * Get combined dashboard data (stats + streams + violations + history)
   * Uses Promise.allSettled for optional endpoints so failures don't break the dashboard.
   */
  public async getDashboardDataAsync(): Promise<TracearrDashboardData> {
    const [stats, streams] = await Promise.all([this.getStatsAsync(), this.getStreamsAsync()]);

    const [violationsResult, historyResult] = await Promise.allSettled([
      this.getViolationsAsync(),
      this.getHistoryAsync(),
    ]);

    return {
      stats,
      streams,
      violations: violationsResult.status === "fulfilled" ? violationsResult.value : undefined,
      recentActivity: historyResult.status === "fulfilled" ? historyResult.value : undefined,
    };
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
    };
  }

  private async proxyImageAsync(
    imageProxy: ImageProxy,
    url: string | null | undefined,
    uniqueId: string,
    discriminator: string,
  ): Promise<string | null> {
    if (!url) return null;
    try {
      const cleanUrl = url.replace(/&fallback=[^&]+/, "").replace(/\?fallback=[^&]+&?/, "?");
      // Build the full URL, then inject _uid as the FIRST query param.
      // This is critical because ImageProxy uses bcrypt which truncates at 72 bytes.
      // Without this, all long avatar/poster URLs from the same session hash identically
      // since they share the same first 72+ bytes.
      const baseUrl = this.url(cleanUrl as `/${string}`).toString();
      const prefix = `_uid=${discriminator}_${uniqueId}&`;
      const fullUrl = baseUrl.includes("?") ? baseUrl.replace("?", `?${prefix}`) : `${baseUrl}?${prefix}`;

      return await imageProxy.createImageAsync(fullUrl, this.getAuthHeaders());
    } catch {
      return null;
    }
  }
}
