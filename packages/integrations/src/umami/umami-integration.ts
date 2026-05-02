import dayjs from "dayjs";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type {
  UmamiEventSeries,
  UmamiMetricItem,
  UmamiPageviewDataPoint,
  UmamiPageviews,
  UmamiStats,
  UmamiVisitorStats,
  UmamiWebsite,
} from "./umami-types";
import {
  umamiActiveVisitorsSchema,
  umamiAuthResponseSchema,
  umamiMetricItemSchema,
  umamiPageviewDataPointSchema,
  umamiPageviewsSchema,
  umamiStatsSchema,
  umamiWebsiteSchema,
} from "./umami-types";

// Umami event type ID for custom events (type 1 = page view, type 2 = custom event)
const UMAMI_CUSTOM_EVENT_TYPE = 2;

const logger = createLogger({ module: "umami-integration" });

export class UmamiIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const authHeaders = await this.getAuthHeadersAsync();
    const url = this.url("/websites");
    const response = await input.fetchAsync(url, {
      headers: authHeaders,
    });

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    return { success: true };
  }

  public async getWebsitesAsync(): Promise<UmamiWebsite[]> {
    const authHeaders = await this.getAuthHeadersAsync();
    const url = this.url("/websites");
    const response = await fetchWithTrustedCertificatesAsync(url, { headers: authHeaders });
    if (!response.ok) throw new ResponseError(response);
    const json = await response.json();
    // Response envelope differs by hosting:
    //   - Umami self-hosted returns the array directly: [website, ...]
    //   - Umami Cloud wraps it: { data: [website, ...] }
    // Same divergence applies to the /events list responses below.
    return Array.isArray(json)
      ? umamiWebsiteSchema.array().parse(json)
      : umamiWebsiteSchema.array().parse((json as { data: unknown }).data);
  }

  // Server-side timeFrame resolution is intentional. Keeping `timeFrame` (a
  // stable string like "7d") in the cache key means all users viewing the same
  // dashboard share one Redis cache entry per (integration, website, timeFrame)
  // for the 5-minute TTL. Client-supplied startAt/endAt would include a
  // per-second `now` and fragment the cache one-per-user-per-second.
  //
  // Window bounds mirror Umami UI preset semantics, verified against the
  // Umami Cloud dashboard for the same site and timeFrame: each "Last N"
  // preset includes the in-progress period as one of N + 1 buckets, snapped
  // to bucket boundaries.
  //   - "24h":  current hour  + 24 prior hours (25-bucket hour grid)
  //   - "7d":   current day   +  7 prior days  ( 8-bucket day grid)
  //   - "30d":  current day   + 30 prior days  (31-bucket day grid)
  //   - "today" / "month" / "lastMonth": calendar-aligned windows.
  //
  // Caveat: dayjs() uses the server's local timezone. Callers needing user-local
  // boundaries (e.g. "today") may see off-by-one behaviour when the server
  // runs in UTC but the user is in a different timezone.
  private computeTimeRange(timeFrame: string): { startAt: number; endAt: number; unit: string } {
    const startOfToday = dayjs().startOf("day");
    const endOfToday = dayjs().endOf("day");

    switch (timeFrame) {
      case "today":
        return { startAt: startOfToday.valueOf(), endAt: endOfToday.valueOf(), unit: "hour" };
      case "7d":
        return {
          startAt: startOfToday.subtract(7, "day").valueOf(),
          endAt: endOfToday.valueOf(),
          unit: "day",
        };
      case "30d":
        return {
          startAt: startOfToday.subtract(30, "day").valueOf(),
          endAt: endOfToday.valueOf(),
          unit: "day",
        };
      case "month":
        return {
          startAt: dayjs().startOf("month").valueOf(),
          endAt: dayjs().endOf("month").valueOf(),
          unit: "day",
        };
      case "lastMonth": {
        const lastMonth = dayjs().subtract(1, "month");
        return {
          startAt: lastMonth.startOf("month").valueOf(),
          endAt: lastMonth.endOf("month").valueOf(),
          unit: "day",
        };
      }
      case "24h":
      default:
        return {
          startAt: dayjs().subtract(24, "hour").startOf("hour").valueOf(),
          endAt: dayjs().endOf("hour").valueOf(),
          unit: "hour",
        };
    }
  }

  public async getVisitorStatsAsync(
    websiteId: string,
    timeFrame = "24h",
    eventName?: string,
  ): Promise<UmamiVisitorStats> {
    const authHeaders = await this.getAuthHeadersAsync();
    const website = await this.getWebsiteByIdAsync(websiteId, authHeaders);

    const { startAt, endAt, unit } = this.computeTimeRange(timeFrame);

    const [stats, pageviews, eventMetrics, eventTimeSeries] = await Promise.all([
      this.getWebsiteStatsAsync(website.id, startAt, endAt, authHeaders),
      this.getWebsitePageviewsAsync(website.id, startAt, endAt, authHeaders, unit),
      eventName ? this.getWebsiteEventMetricsAsync(website.id, startAt, endAt, authHeaders) : Promise.resolve(null),
      eventName
        ? this.getWebsiteEventTimeSeriesAsync(website.id, startAt, endAt, unit, eventName, authHeaders)
        : Promise.resolve(null),
    ]);

    const eventCount = eventName && eventMetrics ? (eventMetrics.find((m) => m.x === eventName)?.y ?? 0) : undefined;

    const eventByTimestamp = new Map<number, number>(
      (eventTimeSeries ?? []).map((e) => [this.parseUmamiDate(e.x), e.y]),
    );
    const dataPoints = pageviews.sessions.map((point) => ({
      timestamp: point.x,
      visitors: point.y,
      ...(eventTimeSeries ? { events: eventByTimestamp.get(this.parseUmamiDate(point.x)) ?? 0 } : {}),
    }));

    return {
      domain: website.domain,
      websiteName: website.name,
      websiteId: website.id,
      totalVisitors: stats.visitors,
      totalPageviews: stats.pageviews,
      totalVisits: stats.visits,
      bounceRate: stats.visits > 0 ? Math.round((stats.bounces / stats.visits) * 100) : 0,
      avgDuration: stats.visits > 0 ? Math.round(stats.totaltime / stats.visits) : 0,
      dataPoints,
      timeFrame,
      eventCount,
    };
  }

  public async getEventNamesAsync(websiteId: string): Promise<string[]> {
    const authHeaders = await this.getAuthHeadersAsync();
    const now = Date.now();
    const startAt = dayjs().subtract(30, "day").valueOf();
    const url = this.url(`/websites/${websiteId}/events`, {
      startAt: startAt.toString(),
      endAt: now.toString(),
      pageSize: "100000",
    });
    const response = await fetchWithTrustedCertificatesAsync(url, { headers: authHeaders });
    if (!response.ok) {
      logger.warn("Failed to load event names", { status: response.status, websiteId });
      return [];
    }
    const json = await response.json();
    const rawArray: unknown[] = Array.isArray(json)
      ? json
      : json && typeof json === "object" && "data" in json && Array.isArray((json as { data: unknown }).data)
        ? (json as { data: unknown[] }).data
        : [];
    const names = new Set<string>();
    for (const item of rawArray) {
      const record = item as Record<string, unknown>;
      if (typeof record.eventName === "string" && record.eventName) {
        names.add(record.eventName);
      }
    }
    return [...names].sort();
  }

  public async getActiveVisitorsAsync(websiteId: string): Promise<number> {
    const authHeaders = await this.getAuthHeadersAsync();
    const url = this.url(`/websites/${websiteId}/active`);
    const response = await fetchWithTrustedCertificatesAsync(url, { headers: authHeaders });
    if (!response.ok) {
      logger.warn("Failed to load active visitors", { status: response.status, websiteId });
      return 0;
    }
    return umamiActiveVisitorsSchema.parse(await response.json()).x;
  }

  /**
   * Umami self-hosted returns "YYYY-MM-DD HH:MM:SS"; Umami Cloud returns ISO 8601.
   * Normalise both to epoch ms so timestamps from /pageviews and /events join.
   */
  private parseUmamiDate(s: string): number {
    return new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`).getTime();
  }

  private async getWebsiteByIdAsync(websiteId: string, authHeaders: Record<string, string>): Promise<UmamiWebsite> {
    const url = this.url(`/websites/${websiteId}`);
    const response = await fetchWithTrustedCertificatesAsync(url, { headers: authHeaders });
    if (!response.ok) throw new ResponseError(response);
    return umamiWebsiteSchema.parse(await response.json());
  }

  public async getTopPagesAsync(websiteId: string, timeFrame: string, limit: number): Promise<UmamiMetricItem[]> {
    const authHeaders = await this.getAuthHeadersAsync();
    const { startAt, endAt } = this.computeTimeRange(timeFrame);
    return this.getWebsiteMetricsAsync(websiteId, startAt, endAt, "path", authHeaders, limit);
  }

  public async getTopReferrersAsync(websiteId: string, timeFrame: string, limit: number): Promise<UmamiMetricItem[]> {
    const authHeaders = await this.getAuthHeadersAsync();
    const { startAt, endAt } = this.computeTimeRange(timeFrame);
    return this.getWebsiteMetricsAsync(websiteId, startAt, endAt, "referrer", authHeaders, limit);
  }

  public async getMultiEventTimeSeriesAsync(
    websiteId: string,
    timeFrame: string,
    eventNames: string[],
  ): Promise<UmamiEventSeries[]> {
    const authHeaders = await this.getAuthHeadersAsync();
    const { startAt, endAt, unit } = this.computeTimeRange(timeFrame);
    const results = await Promise.all(
      eventNames.map(async (eventName) => {
        const dataPoints = await this.getWebsiteEventTimeSeriesAsync(
          websiteId,
          startAt,
          endAt,
          unit,
          eventName,
          authHeaders,
        );
        return { eventName, dataPoints: dataPoints ?? [] };
      }),
    );
    return results;
  }

  private async getWebsiteEventMetricsAsync(
    websiteId: string,
    startAt: number,
    endAt: number,
    authHeaders: Record<string, string>,
  ): Promise<UmamiMetricItem[]> {
    return await this.getWebsiteMetricsAsync(websiteId, startAt, endAt, "event", authHeaders);
  }

  private async getWebsiteMetricsAsync(
    websiteId: string,
    startAt: number,
    endAt: number,
    type: "event" | "path" | "referrer",
    authHeaders: Record<string, string>,
    limit?: number,
  ): Promise<UmamiMetricItem[]> {
    const params: Record<string, string> = {
      startAt: startAt.toString(),
      endAt: endAt.toString(),
      type,
    };
    if (limit !== undefined) params.limit = limit.toString();
    const url = this.url(`/websites/${websiteId}/metrics`, params);
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: authHeaders,
    });

    if (!response.ok) {
      logger.warn("Failed to load website metrics", { status: response.status, websiteId, type });
      return [];
    }

    const json = await response.json();
    if (Array.isArray(json)) return umamiMetricItemSchema.array().parse(json);
    logger.warn("Unexpected metrics response shape", { websiteId, type });
    return [];
  }

  private async getWebsiteEventTimeSeriesAsync(
    websiteId: string,
    startAt: number,
    endAt: number,
    unit: string,
    eventName: string,
    authHeaders: Record<string, string>,
  ): Promise<UmamiPageviewDataPoint[] | undefined> {
    const url = this.url(`/websites/${websiteId}/events`, {
      startAt: startAt.toString(),
      endAt: endAt.toString(),
      unit,
      timezone: "UTC",
      eventName,
      pageSize: "100000",
    });
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: authHeaders,
    });

    if (!response.ok) {
      logger.warn("Failed to load event time series", { status: response.status, websiteId, eventName });
      return undefined;
    }

    const json = await response.json();
    const rawArray: unknown[] = Array.isArray(json)
      ? json
      : json && typeof json === "object" && "data" in json && Array.isArray((json as { data: unknown }).data)
        ? (json as { data: unknown[] }).data
        : [];

    if (rawArray.length === 0) return undefined;

    const firstItem = rawArray[0] as Record<string, unknown>;

    // Two response shapes coexist:
    //   - Umami self-hosted returns aggregated buckets: { x: timestamp, y: count }
    //   - Umami Cloud returns raw event records: { createdAt, eventName, eventType }
    // We aggregate the raw Cloud records ourselves into the same bucket grid so
    // the result joins cleanly with /pageviews timestamps.

    // Aggregated { x, y } format — parse directly (self-hosted instances)
    if ("x" in firstItem && "y" in firstItem) {
      const points = umamiPageviewDataPointSchema.array().parse(rawArray);
      return points.length === 0 ? undefined : points;
    }

    // Raw event records — aggregate by time bucket (Umami Cloud)
    if ("createdAt" in firstItem) {
      const pad = (n: number) => String(n).padStart(2, "0");
      // Format must match Umami's pageview x-axis timestamps: "YYYY-MM-DD HH:MM:SS"
      const truncate = (isoDate: string): string => {
        const d = new Date(isoDate);
        const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
        if (unit === "hour") {
          return `${date} ${pad(d.getUTCHours())}:00:00`;
        }
        if (unit === "month") {
          return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01 00:00:00`;
        }
        return `${date} 00:00:00`;
      };

      const buckets = new Map<string, number>();
      for (const item of rawArray) {
        const e = item as { eventType?: number; eventName?: string; createdAt: string };
        if (e.eventType !== UMAMI_CUSTOM_EVENT_TYPE || e.eventName !== eventName) continue;
        const bucket = truncate(e.createdAt);
        buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
      }
      if (buckets.size === 0) return undefined;
      return Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([x, y]) => ({ x, y }));
    }

    return undefined;
  }

  private async getWebsiteStatsAsync(
    websiteId: string,
    startAt: number,
    endAt: number,
    authHeaders: Record<string, string>,
  ): Promise<UmamiStats> {
    const url = this.url(`/websites/${websiteId}/stats`, {
      startAt: startAt.toString(),
      endAt: endAt.toString(),
    });
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: authHeaders,
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return umamiStatsSchema.parse(await response.json());
  }

  private async getWebsitePageviewsAsync(
    websiteId: string,
    startAt: number,
    endAt: number,
    authHeaders: Record<string, string>,
    unit = "hour",
  ): Promise<UmamiPageviews> {
    const url = this.url(`/websites/${websiteId}/pageviews`, {
      startAt: startAt.toString(),
      endAt: endAt.toString(),
      unit,
      timezone: "UTC",
    });
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: authHeaders,
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return umamiPageviewsSchema.parse(await response.json());
  }

  private async getAuthHeadersAsync(): Promise<Record<string, string>> {
    if (this.hasSecretValue("apiKey")) {
      return { "x-umami-api-key": this.getSecretValue("apiKey") };
    }
    const token = await this.getJwtTokenAsync();
    return { Authorization: `Bearer ${token}` };
  }

  private async getJwtTokenAsync(): Promise<string> {
    const url = this.url("/auth/login");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: this.getSecretValue("username"),
        password: this.getSecretValue("password"),
      }),
    });
    if (!response.ok) throw new ResponseError(response);
    return umamiAuthResponseSchema.parse(await response.json()).token;
  }
}
