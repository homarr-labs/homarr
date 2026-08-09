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

/**
 * Records per page when /events returns raw event rows rather than aggregated buckets.
 *
 * Requesting the whole list at once makes the server hold all of it: one measured refresh
 * pulled a 46.3 MiB JSON body assembled from 3,946 socket chunks, and `Response.json()`
 * keeps the chunk list and the joined copy alive at the same time, so the true peak was
 * roughly double. Pages are folded into the bucket map and released, so only one page is
 * ever resident.
 *
 * 5,000 rather than something smaller because this trades against round trips, not just
 * memory: a page is ~2.3 MiB, so the peak stays small, while any site with fewer than 5,000
 * events in the window — which is most of them — still completes in a single request.
 */
const UMAMI_EVENT_PAGE_SIZE = 5_000;
/**
 * Ceiling on pages, so a very busy site degrades into an undercount that is logged rather
 * than into unbounded memory. Preserves the previous 100k-record ceiling.
 */
const UMAMI_EVENT_PAGE_MAX = 20;

const logger = createLogger({ module: "umami-integration" });

const pad = (number: number) => String(number).padStart(2, "0");

/** Umami returns either a bare array or `{ data: [...] }` depending on endpoint and version. */
const extractDataArray = (json: unknown): unknown[] => {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object" && "data" in json && Array.isArray((json as { data: unknown }).data)) {
    return (json as { data: unknown[] }).data;
  }
  return [];
};

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

    const eventCount = eventName && eventMetrics ? (eventMetrics.find(({ x }) => x === eventName)?.y ?? 0) : undefined;

    const eventByTimestamp = new Map<number, number>(
      (eventTimeSeries ?? []).map(({ x, y }) => [this.parseUmamiDate(x), y]),
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

  /**
   * Distinct custom event names over the last 30 days.
   *
   * Uses the aggregated `/metrics?type=event` endpoint, which returns one row per event
   * name. The obvious alternative — listing `/events` and collecting the distinct
   * `eventName` values — downloads every raw event record to compute a handful of strings:
   * on a busy site that measured a 46.3 MiB JSON response, and `Response.json()` holds the
   * socket chunks and the joined copy simultaneously, so the real cost was about twice that.
   *
   * The two are not exactly equivalent: /metrics returns the top names by count, so an
   * extremely rare event could fall outside it. The list endpoint was bounded too — it
   * capped at a record count, which on a busy site does not even span the 30-day window —
   * so this trades one incomplete answer for a much cheaper one, in a picker where the
   * names worth choosing are the ones with traffic.
   */
  public async getEventNamesAsync(websiteId: string): Promise<string[]> {
    const authHeaders = await this.getAuthHeadersAsync();
    const endAt = Date.now();
    const startAt = dayjs().subtract(30, "day").valueOf();
    const metrics = await this.getWebsiteMetricsAsync(websiteId, startAt, endAt, "event", authHeaders);
    const names = new Set<string>();
    for (const metric of metrics) {
      if (metric.x) names.add(metric.x);
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
    return umamiActiveVisitorsSchema.parse(await response.json()).visitors;
  }

  /**
   * Umami self-hosted returns "YYYY-MM-DD HH:MM:SS"; Umami Cloud returns ISO 8601.
   * Normalise both to epoch ms so timestamps from /pageviews and /events join.
   */
  private parseUmamiDate(dateString: string): number {
    return new Date(dateString.includes("T") ? dateString : `${dateString.replace(" ", "T")}Z`).getTime();
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

    // Sequentially, not with Promise.all over every name. Each series can be several pages
    // of raw events on a busy site, and running them all at once multiplies the resident
    // pages by the number of tracked events — which is how one widget refresh was able to
    // put well over a hundred megabytes in flight at the same time.
    const results: UmamiEventSeries[] = [];
    for (const eventName of eventNames) {
      const dataPoints = await this.getWebsiteEventTimeSeriesAsync(
        websiteId,
        startAt,
        endAt,
        unit,
        eventName,
        authHeaders,
      );
      results.push({ eventName, dataPoints: dataPoints ?? [] });
    }
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

  /**
   * Per-event time series.
   *
   * Two response shapes coexist:
   *   - Umami self-hosted returns aggregated buckets: { x: timestamp, y: count }
   *   - Umami Cloud returns raw event records: { createdAt, eventName, eventType }
   * The raw records are bucketed here onto the same grid so the result joins cleanly with
   * /pageviews timestamps. Raw pages are folded in one at a time — see UMAMI_EVENT_PAGE_SIZE
   * for why fetching them in a single page was the largest allocation in the server.
   */
  private async getWebsiteEventTimeSeriesAsync(
    websiteId: string,
    startAt: number,
    endAt: number,
    unit: string,
    eventName: string,
    authHeaders: Record<string, string>,
  ): Promise<UmamiPageviewDataPoint[] | undefined> {
    // Format must match Umami's pageview x-axis timestamps: "YYYY-MM-DD HH:MM:SS"
    const truncate = (isoDate: string): string => {
      const date = new Date(isoDate);
      const dateString = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
      if (unit === "hour") {
        return `${dateString} ${pad(date.getUTCHours())}:00:00`;
      }
      if (unit === "month") {
        return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-01 00:00:00`;
      }
      return `${dateString} 00:00:00`;
    };

    const buckets = new Map<string, number>();
    let previousFirstId: string | undefined;
    let truncated = false;

    for (let page = 1; ; page++) {
      const url = this.url(`/websites/${websiteId}/events`, {
        startAt: startAt.toString(),
        endAt: endAt.toString(),
        unit,
        timezone: "UTC",
        eventName,
        page: page.toString(),
        pageSize: UMAMI_EVENT_PAGE_SIZE.toString(),
      });
      const response = await fetchWithTrustedCertificatesAsync(url, {
        headers: authHeaders,
      });

      if (!response.ok) {
        logger.warn("Failed to load event time series", { status: response.status, websiteId, eventName, page });
        break;
      }

      const rawArray = extractDataArray(await response.json());
      if (rawArray.length === 0) break;

      const firstItem = rawArray[0] as Record<string, unknown>;

      // Aggregated { x, y }: this instance ignored paging and returned the whole series, so
      // there is nothing to accumulate across pages.
      if ("x" in firstItem && "y" in firstItem) {
        const points = umamiPageviewDataPointSchema.array().parse(rawArray);
        return points.length === 0 ? undefined : points;
      }
      if (!("createdAt" in firstItem)) return undefined;

      // An instance that accepts pageSize but ignores page would hand back the same rows
      // forever, and each pass would count them into the buckets again. Falls back to
      // session+timestamp where records carry no id, so the guard still holds.
      const firstId =
        typeof firstItem.id === "string"
          ? firstItem.id
          : typeof firstItem.createdAt === "string"
            ? `${String(firstItem.sessionId ?? "")}@${firstItem.createdAt}`
            : undefined;
      if (page > 1 && firstId !== undefined && firstId === previousFirstId) {
        logger.warn("Umami ignored event paging, stopping after the first page", { websiteId, eventName });
        break;
      }
      previousFirstId = firstId;

      for (const item of rawArray) {
        const event = item as { eventType?: number; eventName?: string; createdAt: string };
        if (event.eventType !== UMAMI_CUSTOM_EVENT_TYPE || event.eventName !== eventName) continue;
        const bucket = truncate(event.createdAt);
        buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
      }

      if (rawArray.length < UMAMI_EVENT_PAGE_SIZE) break;
      if (page >= UMAMI_EVENT_PAGE_MAX) {
        truncated = true;
        break;
      }
    }

    if (truncated) {
      logger.warn("Event time series hit the page ceiling, counts are a lower bound", {
        websiteId,
        eventName,
        maxRecords: UMAMI_EVENT_PAGE_SIZE * UMAMI_EVENT_PAGE_MAX,
      });
    }
    if (buckets.size === 0) return undefined;
    return (
      Array.from(buckets.entries())
        .sort(([itemA], [itemB]) => itemA.localeCompare(itemB))
        // eslint-disable-next-line id-length
        .map(([x, y]) => ({ x, y }))
    );
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
