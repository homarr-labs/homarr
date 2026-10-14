import dayjs from "dayjs";
import { isRecord } from "@homarr/common/object";

import type { IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import type {
  UmamiEventSeries,
  UmamiMetricItem,
  UmamiPageviewDataPoint,
  UmamiVisitorStats,
} from "../../umami/umami-types";
import {
  umamiActiveVisitorsSchema,
  umamiAuthResponseSchema,
  umamiMetricItemSchema,
  umamiPageviewDataPointSchema,
  umamiPageviewsSchema,
  umamiStatsSchema,
  umamiWebsiteSchema,
} from "../../umami/umami-types";
import { IntegrationTransportStatusError } from "../../runtime/transport-errors";
import { SpecialistProtocol, settleSpecialistTasksAsync } from "./protocol";
import type { SpecialistHttp } from "./protocol";

const EVENT_TYPE = 2;
const EVENT_NAME_LIMIT = 5_000;
const PAGE_SIZE = 5_000;
const PAGE_MAX = 20;
const pad = (number: number) => String(number).padStart(2, "0");
const parseDate = (value: string) => new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`).getTime();

const timeRange = (timeFrame: string) => {
  const startOfToday = dayjs().startOf("day");
  const endOfToday = dayjs().endOf("day");
  switch (timeFrame) {
    case "today":
      return { startAt: startOfToday.valueOf(), endAt: endOfToday.valueOf(), unit: "hour" };
    case "7d":
      return { startAt: startOfToday.subtract(7, "day").valueOf(), endAt: endOfToday.valueOf(), unit: "day" };
    case "30d":
      return { startAt: startOfToday.subtract(30, "day").valueOf(), endAt: endOfToday.valueOf(), unit: "day" };
    case "month":
      return { startAt: dayjs().startOf("month").valueOf(), endAt: dayjs().endOf("month").valueOf(), unit: "day" };
    case "lastMonth": {
      const lastMonth = dayjs().subtract(1, "month");
      return { startAt: lastMonth.startOf("month").valueOf(), endAt: lastMonth.endOf("month").valueOf(), unit: "day" };
    }
    default:
      return {
        startAt: dayjs().subtract(24, "hour").startOf("hour").valueOf(),
        endAt: dayjs().endOf("hour").valueOf(),
        unit: "hour",
      };
  }
};

export class UmamiProtocol extends SpecialistProtocol {
  async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    if (this.hasSecret("apiKey")) {
      const apiKey = this.secret("apiKey");
      return { headers: { "x-umami-api-key": apiKey }, redactValues: [apiKey] };
    }
    return this.runAsync(async (http) => {
      const token = await this.tokenAsync(http);
      return { headers: { Authorization: `Bearer ${token}` }, redactValues: [token] };
    });
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const http = this.testingHttp(input);
    const headers = await this.headersAsync(http);
    return http.responseAsync(this.url("/websites"), { headers }, async (response) =>
      response.ok ? { success: true } : this.statusResult(response),
    );
  }

  getWebsitesAsync() {
    return this.runAsync(async (http) => {
      const json = await http.jsonAsync(this.url("/websites"), { headers: await this.headersAsync(http) });
      return umamiWebsiteSchema.array().parse(Array.isArray(json) ? json : isRecord(json) ? json.data : undefined);
    });
  }

  async getVisitorStatsAsync(websiteId: string, timeFrame = "24h", eventName?: string): Promise<UmamiVisitorStats> {
    return this.runAsync(async (http) => {
      const headers = await this.headersAsync(http);
      const website = umamiWebsiteSchema.parse(await http.jsonAsync(this.url(`/websites/${websiteId}`), { headers }));
      const { startAt, endAt, unit } = timeRange(timeFrame);
      const [stats, pageviews, eventMetrics, eventSeries] = await settleSpecialistTasksAsync([
        http
          .jsonAsync(this.url(`/websites/${website.id}/stats`, { startAt, endAt }), { headers })
          .then((value) => umamiStatsSchema.parse(value)),
        http
          .jsonAsync(this.url(`/websites/${website.id}/pageviews`, { startAt, endAt, unit, timezone: "UTC" }), {
            headers,
          })
          .then((value) => umamiPageviewsSchema.parse(value)),
        eventName ? this.metricsAsync(http, website.id, startAt, endAt, "event", headers) : Promise.resolve(null),
        eventName
          ? this.eventSeriesAsync(http, website.id, startAt, endAt, unit, eventName, headers)
          : Promise.resolve(null),
      ] as const);
      const eventByTimestamp = new Map((eventSeries ?? []).map(({ x, y }) => [parseDate(x), y]));
      return {
        domain: website.domain,
        websiteName: website.name,
        websiteId: website.id,
        totalVisitors: stats.visitors,
        totalPageviews: stats.pageviews,
        totalVisits: stats.visits,
        bounceRate: stats.visits > 0 ? Math.round((stats.bounces / stats.visits) * 100) : 0,
        avgDuration: stats.visits > 0 ? Math.round(stats.totaltime / stats.visits) : 0,
        dataPoints: pageviews.sessions.map((point) => ({
          timestamp: point.x,
          visitors: point.y,
          ...(eventSeries ? { events: eventByTimestamp.get(parseDate(point.x)) ?? 0 } : {}),
        })),
        timeFrame,
        eventCount: eventName && eventMetrics ? (eventMetrics.find(({ x }) => x === eventName)?.y ?? 0) : undefined,
      };
    });
  }

  getEventNamesAsync(websiteId: string) {
    return this.runAsync(async (http) => {
      const headers = await this.headersAsync(http);
      const metrics = await this.metricsAsync(
        http,
        websiteId,
        dayjs().subtract(30, "day").valueOf(),
        Date.now(),
        "event",
        headers,
        EVENT_NAME_LIMIT,
      );
      return [...new Set(metrics.map((metric) => metric.x).filter(Boolean))].toSorted();
    });
  }

  getActiveVisitorsAsync(websiteId: string) {
    return this.runAsync(async (http) =>
      http.responseAsync(
        this.url(`/websites/${websiteId}/active`),
        { headers: await this.headersAsync(http) },
        async (response) => {
          if (!response.ok) {
            this.resources.log?.write("warn", "Failed to load active visitors", { status: response.status });
            return 0;
          }
          return umamiActiveVisitorsSchema.parse(await response.json()).visitors;
        },
      ),
    );
  }

  getTopPagesAsync(websiteId: string, timeFrame: string, limit: number) {
    return this.topMetricsAsync(websiteId, timeFrame, limit, "path");
  }

  getTopReferrersAsync(websiteId: string, timeFrame: string, limit: number) {
    return this.topMetricsAsync(websiteId, timeFrame, limit, "referrer");
  }

  async getMultiEventTimeSeriesAsync(
    websiteId: string,
    timeFrame: string,
    eventNames: string[],
  ): Promise<UmamiEventSeries[]> {
    return this.runAsync(async (http) => {
      const headers = await this.headersAsync(http);
      const { startAt, endAt, unit } = timeRange(timeFrame);
      const results: UmamiEventSeries[] = [];
      for (const eventName of eventNames)
        results.push({
          eventName,
          dataPoints: (await this.eventSeriesAsync(http, websiteId, startAt, endAt, unit, eventName, headers)) ?? [],
        });
      return results;
    });
  }

  private topMetricsAsync(websiteId: string, timeFrame: string, limit: number, type: "path" | "referrer") {
    return this.runAsync(async (http) => {
      const headers = await this.headersAsync(http);
      const { startAt, endAt } = timeRange(timeFrame);
      return this.metricsAsync(http, websiteId, startAt, endAt, type, headers, limit);
    });
  }

  private async headersAsync(http: SpecialistHttp): Promise<Record<string, string>> {
    if (this.hasSecret("apiKey")) return { "x-umami-api-key": this.secret("apiKey") };
    return { Authorization: `Bearer ${await this.tokenAsync(http)}` };
  }

  private async tokenAsync(http: SpecialistHttp) {
    return umamiAuthResponseSchema.parse(
      await http.jsonAsync(this.url("/auth/login"), {
        method: "POST",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: this.secret("username"), password: this.secret("password") }),
      }),
    ).token;
  }

  private metricsAsync(
    http: SpecialistHttp,
    websiteId: string,
    startAt: number,
    endAt: number,
    type: "event" | "path" | "referrer",
    headers: Record<string, string>,
    limit?: number,
  ): Promise<UmamiMetricItem[]> {
    return http.responseAsync(
      this.url(`/websites/${websiteId}/metrics`, { startAt, endAt, type, limit }),
      { headers },
      async (response) => {
        if (!response.ok) {
          this.resources.log?.write("warn", "Failed to load website metrics", { status: response.status, type });
          return [];
        }
        const json: unknown = await response.json();
        if (Array.isArray(json)) return umamiMetricItemSchema.array().parse(json);
        this.resources.log?.write("warn", "Unexpected metrics response shape", { type });
        return [];
      },
    );
  }

  private async eventSeriesAsync(
    http: SpecialistHttp,
    websiteId: string,
    startAt: number,
    endAt: number,
    unit: string,
    eventName: string,
    headers: Record<string, string>,
  ): Promise<UmamiPageviewDataPoint[] | undefined> {
    const truncate = (value: string) => {
      const date = new Date(value);
      const dateString = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
      if (unit === "hour") return `${dateString} ${pad(date.getUTCHours())}:00:00`;
      if (unit === "month") return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-01 00:00:00`;
      return `${dateString} 00:00:00`;
    };
    const buckets = new Map<string, number>();
    let previousFirstId: string | undefined;
    let truncated = false;
    for (let page = 1; ; page++) {
      const json = await http
        .responseAsync(
          this.url(`/websites/${websiteId}/events`, {
            startAt,
            endAt,
            unit,
            timezone: "UTC",
            event: eventName,
            eventName,
            page,
            pageSize: PAGE_SIZE,
          }),
          { headers },
          async (response) => {
            if (!response.ok) throw new IntegrationTransportStatusError(response.status);
            return await response.json();
          },
        )
        .catch((error: unknown) => {
          this.resources.context.signal.throwIfAborted();
          if (error instanceof IntegrationTransportStatusError) {
            this.resources.log?.write("warn", "Failed to load event time series", { status: error.status, page });
            return undefined;
          }
          throw error;
        });
      if (json === undefined) return undefined;
      const rawArray: unknown[] = Array.isArray(json)
        ? json
        : isRecord(json) && Array.isArray(json.data)
          ? json.data
          : [];
      if (rawArray.length === 0) break;
      if (page > PAGE_MAX) {
        truncated = true;
        break;
      }
      const first: unknown = rawArray[0];
      if (!isRecord(first)) return undefined;
      if ("x" in first && "y" in first) {
        const points = umamiPageviewDataPointSchema.array().parse(rawArray);
        return points.length === 0 ? undefined : points;
      }
      if (!("createdAt" in first)) return undefined;
      const firstId =
        typeof first.id === "string"
          ? first.id
          : typeof first.createdAt === "string"
            ? `${String(first.sessionId ?? "")}@${first.createdAt}`
            : undefined;
      if (page > 1 && firstId !== undefined && firstId === previousFirstId) {
        this.resources.log?.write("warn", "Umami ignored event paging, stopping after the first page", {});
        break;
      }
      previousFirstId = firstId;
      for (const item of rawArray) {
        if (!isRecord(item) || item.eventType !== EVENT_TYPE || item.eventName !== eventName) continue;
        if (typeof item.createdAt !== "string") throw new Error("Invalid Umami event timestamp");
        const bucket = truncate(item.createdAt);
        buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
      }
      if (rawArray.length < PAGE_SIZE) break;
    }
    if (truncated)
      this.resources.log?.write("warn", "Event time series hit the page ceiling, counts are a lower bound", {
        maxRecords: PAGE_SIZE * PAGE_MAX,
      });
    return buckets.size === 0
      ? undefined
      : [...buckets.entries()].toSorted(([a], [b]) => a.localeCompare(b)).map(([x, y]) => ({ x, y }));
  }
}
