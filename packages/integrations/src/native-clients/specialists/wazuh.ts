import { Buffer } from "node:buffer";
import { removeTrailingSlash } from "@homarr/common/url";
import { isRecord } from "@homarr/common/object";
import { z } from "zod";

import type { IntegrationInput, IntegrationTestingInput } from "../../base/integration";
import { createSessionStore } from "../../base/session-store";
import type { SessionStore } from "../../base/session-store";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import type { IntegrationRuntimeResources } from "../../runtime/contracts";
import {
  IntegrationTransportParseError,
  IntegrationTransportRequestError,
  IntegrationTransportStatusError,
} from "../../runtime/transport-errors";
import {
  alertSourceFields,
  authFailureQuery,
  bruteForceQuery,
  getTotalHits,
  mapAlertHit,
  normalizeAgentStatus,
  normalizeGroups,
  normalizeVersion,
  resolveTimelineIntervalMs,
  severityRangeAggregation,
  timeRangeMs,
  toSeverityCounts,
} from "../../wazuh/wazuh-queries";
import type { WazuhErrorReason } from "../../wazuh/wazuh-errors";
import type {
  WazuhAgent,
  WazuhAgentCounts,
  WazuhAgentsOverview,
  WazuhAlert,
  WazuhAlertTimeline,
  WazuhAuthFailures,
  WazuhCveOrder,
  WazuhDataSource,
  WazuhFimEvent,
  WazuhFimEventFilter,
  WazuhFimOverview,
  WazuhSecuritySummary,
  WazuhTimelineInterval,
  WazuhTimeRange,
  WazuhTopList,
  WazuhTopListEntry,
  WazuhTopListKind,
  WazuhVulnerabilityCounts,
  WazuhVulnerabilityOverview,
} from "../../wazuh/wazuh-types";
import {
  SpecialistFetchAcquisitionError,
  SpecialistNonDegradableError,
  SpecialistProtocol,
  SpecialistReportedError,
  settleSpecialistTasksAsync,
} from "./protocol";
import type { SpecialistHttp, SpecialistQuery } from "./protocol";
import {
  wazuhAlertSourceSchema,
  wazuhApiAgentSchema,
  wazuhBucketSchema,
  wazuhBucketsSchema,
  wazuhItemsSchema,
  wazuhMonitoringSchema,
  wazuhNullableValueSchema,
  wazuhNumericBucketSchema,
  wazuhSearchSchema,
  wazuhSeveritySchema,
  wazuhSummaryStatusSchema,
  wazuhValueSchema,
} from "./wazuh-wire";

const basicAuth = (username: string, password: string) =>
  `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
const noSource = z.never();

export class WazuhProtocolError extends SpecialistReportedError {
  constructor(
    public readonly target: WazuhDataSource | null,
    public readonly reason: WazuhErrorReason,
    public readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(`Wazuh ${target ?? "integration"} request failed: ${reason}${status ? ` (${status})` : ""}`, options);
    this.name = "WazuhProtocolError";
  }
}

export class WazuhProtocol extends SpecialistProtocol {
  private readonly session: SessionStore<unknown>;

  constructor(integration: IntegrationInput, resources: IntegrationRuntimeResources) {
    super(integration, resources);
    this.session = createSessionStore<unknown>(integration, resources.sessions);
  }

  private endpoints() {
    const hasApi = this.hasSecret("username") && this.hasSecret("password");
    const hasIndexerCredentials = this.hasSecret("wazuhIndexerUsername") && this.hasSecret("wazuhIndexerPassword");
    const api = hasApi
      ? {
          url: removeTrailingSlash(this.integration.url),
          username: this.secret("username"),
          password: this.secret("password"),
        }
      : null;
    const indexerUrl = hasIndexerCredentials
      ? this.hasSecret("wazuhIndexerUrl")
        ? this.secret("wazuhIndexerUrl")
        : !hasApi
          ? this.integration.url
          : null
      : null;
    const indexer =
      indexerUrl !== null
        ? {
            url: removeTrailingSlash(indexerUrl),
            username: this.secret("wazuhIndexerUsername"),
            password: this.secret("wazuhIndexerPassword"),
          }
        : null;
    return { api, indexer };
  }

  get hasIndexer() {
    return this.endpoints().indexer !== null;
  }

  getDashboardUrl(): string | null {
    if (this.hasSecret("wazuhDashboardUrl")) return removeTrailingSlash(this.secret("wazuhDashboardUrl"));
    const external = this.integration.externalUrl;
    return external && removeTrailingSlash(external) !== removeTrailingSlash(this.integration.url)
      ? removeTrailingSlash(external)
      : null;
  }

  async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    const { api, indexer } = this.endpoints();
    if (api)
      return this.runAsync(async (http) => {
        const token = await this.tokenAsync(http);
        return { headers: { Authorization: `Bearer ${token}` }, redactValues: [token] };
      });
    if (indexer) {
      const header = basicAuth(indexer.username, indexer.password);
      return { headers: { Authorization: header }, redactValues: [header, indexer.password] };
    }
    throw new Error("Wazuh integration has no usable credentials");
  }

  private async requestAsync<T>(
    http: SpecialistHttp,
    target: WazuhDataSource,
    url: string | URL,
    init: { method?: string; headers?: Record<string, string>; body?: string },
    consume: (response: import("undici").Response) => Promise<T>,
  ): Promise<T> {
    const start = performance.now();
    try {
      return await http.responseAsync(
        url,
        { ...init, redirect: "error" },
        async (response) => {
          this.resources.log?.write("debug", "Wazuh response", {
            target,
            status: response.status,
            durationMs: Math.round(performance.now() - start),
          });
          return await consume(response);
        },
        15_000,
      );
    } catch (error) {
      if (error instanceof SpecialistNonDegradableError) throw error;
      if (this.resources.context.signal.aborted)
        throw new SpecialistNonDegradableError("cancellation", [error, this.resources.context.signal.reason]);
      this.resources.context.signal.throwIfAborted();
      if (error instanceof WazuhProtocolError) throw error;
      if (error instanceof IntegrationTransportStatusError)
        throw new WazuhProtocolError(
          target,
          error.status === 401 || error.status === 403 ? "unauthorized" : "status",
          error.status,
        );
      if (error instanceof IntegrationTransportParseError || error instanceof z.ZodError)
        throw new WazuhProtocolError(target, "invalidResponse");
      if (error instanceof SpecialistFetchAcquisitionError)
        throw new WazuhProtocolError(
          target,
          error.diagnostic.type === "certificate"
            ? "certificate"
            : error.diagnostic.type === "timeout"
              ? "timeout"
              : "unreachable",
          undefined,
          { cause: error },
        );
      throw new SpecialistNonDegradableError("callback", [error]);
    }
  }

  private async authenticateAsync(http: SpecialistHttp) {
    const { api } = this.endpoints();
    if (!api) throw new WazuhProtocolError("api", "unauthorized");
    return this.requestAsync(
      http,
      "api",
      `${api.url}/security/user/authenticate?raw=true`,
      { method: "POST", headers: { Authorization: basicAuth(api.username, api.password) } },
      async (response) => {
        if (!response.ok) throw new IntegrationTransportStatusError(response.status);
        const token = (await response.text()).trim();
        if (!token || token.startsWith("{")) throw new WazuhProtocolError("api", "invalidResponse");
        return token;
      },
    );
  }

  private async tokenAsync(http: SpecialistHttp) {
    this.resources.context.signal.throwIfAborted();
    const existing = z.object({ token: z.string() }).safeParse(await this.session.getAsync());
    if (existing.success) return existing.data.token;
    const token = await this.authenticateAsync(http);
    this.resources.context.signal.throwIfAborted();
    await this.session.setAsync({ token }, { ttlSeconds: 600 });
    return token;
  }

  private async apiAsync<T>(
    http: SpecialistHttp,
    path: `/${string}`,
    schema: z.ZodType<T>,
    query?: SpecialistQuery,
  ): Promise<T> {
    const { api } = this.endpoints();
    if (!api) throw new WazuhProtocolError("api", "unauthorized");
    const url = this.url(path, query, api.url);
    const attempt = (token: string) =>
      this.requestAsync(http, "api", url, { headers: { Authorization: `Bearer ${token}` } }, async (response) => {
        if (!response.ok) throw new IntegrationTransportStatusError(response.status);
        const json: unknown = await response.json();
        if (!isRecord(json) || !("data" in json)) throw new WazuhProtocolError("api", "invalidResponse");
        return schema.parse(json.data);
      });
    const initialToken = await this.tokenAsync(http);
    try {
      return await attempt(initialToken);
    } catch (error) {
      if (!(error instanceof WazuhProtocolError) || error.status !== 401) throw error;
      this.resources.context.signal.throwIfAborted();
      await this.session.clearAsync();
      return await attempt(await this.tokenAsync(http));
    }
  }

  private searchAsync<TSource, TAggregations>(
    http: SpecialistHttp,
    pattern: string,
    query: Record<string, unknown>,
    source: z.ZodType<TSource>,
    aggregations: z.ZodType<TAggregations>,
  ) {
    const { indexer } = this.endpoints();
    if (!indexer) throw new WazuhProtocolError("indexer", "indexerRequired");
    return this.requestAsync(
      http,
      "indexer",
      `${indexer.url}/${pattern}/_search?ignore_unavailable=true&allow_no_indices=true`,
      {
        method: "POST",
        headers: { Authorization: basicAuth(indexer.username, indexer.password), "Content-Type": "application/json" },
        body: JSON.stringify(query),
      },
      async (response) => {
        if (!response.ok) throw new IntegrationTransportStatusError(response.status);
        return wazuhSearchSchema(source, aggregations).parse(await response.json());
      },
    );
  }

  async getAgentsOverviewAsync(): Promise<WazuhAgentsOverview> {
    return this.runAsync((http) =>
      this.endpoints().api ? this.agentsFromApiAsync(http) : this.agentsFromIndexerAsync(http),
    );
  }

  private async agentsFromApiAsync(http: SpecialistHttp): Promise<WazuhAgentsOverview> {
    const [summary, agents] = await settleSpecialistTasksAsync([
      this.apiAsync(http, "/agents/summary/status", wazuhSummaryStatusSchema),
      this.apiAsync(http, "/agents", wazuhItemsSchema(wazuhApiAgentSchema), {
        select: "id,name,ip,status,version,lastKeepAlive,group,os.name,os.version,os.platform",
        sort: "+name",
        limit: 1000,
      }),
    ] as const);
    const connection = summary.connection ?? {};
    return {
      source: "api",
      asOf: new Date().toISOString(),
      counts: {
        active: connection.active ?? 0,
        disconnected: connection.disconnected ?? 0,
        neverConnected: connection.never_connected ?? 0,
        pending: connection.pending ?? 0,
        total: connection.total ?? 0,
      },
      agents: agents.affected_items
        .filter((agent) => agent.id !== "000")
        .map((agent) => ({
          id: agent.id,
          name: agent.name ?? agent.id,
          status: normalizeAgentStatus(agent.status),
          ip: agent.ip ?? null,
          osName: agent.os?.name ?? null,
          osVersion: agent.os?.version ?? null,
          osPlatform: agent.os?.platform?.toLowerCase() ?? null,
          version: normalizeVersion(agent.version),
          lastKeepAlive: agent.lastKeepAlive ?? null,
          groups: normalizeGroups(agent.group),
        })),
    };
  }

  private async agentsFromIndexerAsync(http: SpecialistHttp): Promise<WazuhAgentsOverview> {
    const latest = await this.searchAsync(
      http,
      "wazuh-monitoring-*",
      { size: 0, aggs: { latest: { max: { field: "timestamp" } } } },
      noSource,
      z.object({ latest: wazuhNullableValueSchema }),
    );
    const timestamp = latest.aggregations?.latest.value;
    const counts: WazuhAgentCounts = { total: 0, active: 0, disconnected: 0, neverConnected: 0, pending: 0 };
    if (!timestamp) return { source: "indexer", asOf: new Date().toISOString(), counts, agents: [] };
    const snapshot = await this.searchAsync(
      http,
      "wazuh-monitoring-*",
      {
        size: 1000,
        sort: [{ timestamp: { order: "desc" } }],
        _source: ["id", "name", "ip", "status", "version", "lastKeepAlive", "timestamp", "group", "os"],
        query: {
          range: {
            timestamp: {
              gte: new Date(timestamp - 5 * 60 * 1000).toISOString(),
              lte: new Date(timestamp).toISOString(),
            },
          },
        },
      },
      wazuhMonitoringSchema,
      z.unknown(),
    );
    const agents = new Map<string, WazuhAgent>();
    for (const hit of snapshot.hits.hits) {
      const source = hit._source;
      if (!source.id || source.id === "000" || agents.has(source.id)) continue;
      agents.set(source.id, {
        id: source.id,
        name: source.name ?? source.id,
        status: normalizeAgentStatus(source.status),
        ip: source.ip ?? null,
        osName: source.os?.name ?? null,
        osVersion: source.os?.version ?? null,
        osPlatform: source.os?.platform?.toLowerCase() ?? null,
        version: normalizeVersion(source.version),
        lastKeepAlive: source.lastKeepAlive ?? null,
        groups: normalizeGroups(source.group),
      });
    }
    for (const agent of agents.values()) {
      counts.total++;
      if (agent.status === "active") counts.active++;
      else if (agent.status === "disconnected") counts.disconnected++;
      else if (agent.status === "never_connected") counts.neverConnected++;
      else if (agent.status === "pending") counts.pending++;
    }
    return {
      source: "indexer",
      asOf: new Date(timestamp).toISOString(),
      counts,
      agents: [...agents.values()].toSorted((a, b) => a.name.localeCompare(b.name)),
    };
  }

  async getRecentAlertsAsync(input: { minLevel: number; limit: number; hours: number }): Promise<WazuhAlert[]> {
    return this.runAsync(async (http) => {
      const response = await this.searchAsync(
        http,
        "wazuh-alerts-*",
        {
          size: input.limit,
          sort: [{ timestamp: { order: "desc" } }],
          _source: alertSourceFields,
          query: {
            bool: {
              filter: [
                { range: { "rule.level": { gte: input.minLevel } } },
                { range: { timestamp: { gte: `now-${input.hours}h` } } },
              ],
            },
          },
        },
        wazuhAlertSourceSchema,
        z.unknown(),
      );
      return response.hits.hits.map(mapAlertHit);
    });
  }

  async getAlertTimelineAsync(input: {
    range: WazuhTimeRange;
    interval: WazuhTimelineInterval;
    minLevel: number;
  }): Promise<WazuhAlertTimeline> {
    return this.runAsync(async (http) => {
      const intervalMs = resolveTimelineIntervalMs(input.range, input.interval);
      const now = Date.now();
      const windowStart = now - timeRangeMs[input.range];
      const end = Math.ceil(now / intervalMs) * intervalMs;
      const start = Math.floor(windowStart / intervalMs) * intervalMs;
      const response = await this.searchAsync(
        http,
        "wazuh-alerts-*",
        {
          size: 0,
          track_total_hits: true,
          query: {
            bool: {
              filter: [
                { range: { timestamp: { gte: windowStart, lte: now, format: "epoch_millis" } } },
                ...(input.minLevel > 0 ? [{ range: { "rule.level": { gte: input.minLevel } } }] : []),
              ],
            },
          },
          aggs: {
            timeline: {
              date_histogram: {
                field: "timestamp",
                fixed_interval: `${Math.round(intervalMs / 1000)}s`,
                min_doc_count: 0,
                extended_bounds: { min: start, max: end - intervalMs },
              },
              aggs: { severity: severityRangeAggregation },
            },
            severity: severityRangeAggregation,
          },
        },
        noSource,
        z.object({
          timeline: z.object({ buckets: z.array(wazuhNumericBucketSchema.extend({ severity: wazuhSeveritySchema })) }),
          severity: wazuhSeveritySchema,
        }),
      );
      return {
        range: input.range,
        intervalMs,
        totals: toSeverityCounts(response.aggregations?.severity, getTotalHits(response.hits.total)),
        points: (response.aggregations?.timeline.buckets ?? []).map((bucket) => {
          const counts = toSeverityCounts(bucket.severity, bucket.doc_count);
          return {
            timestamp: bucket.key,
            low: counts.low,
            medium: counts.medium,
            high: counts.high,
            critical: counts.critical,
          };
        }),
      };
    });
  }

  async getTopListAsync(input: {
    kind: WazuhTopListKind;
    range: WazuhTimeRange;
    limit: number;
    minLevel: number;
  }): Promise<WazuhTopList> {
    return this.runAsync(async (http) => {
      const fields: Record<WazuhTopListKind, string> = {
        rules: "rule.id",
        agents: "agent.name",
        sourceIps: "data.srcip",
        mitreTactics: "rule.mitre.tactic",
        mitreTechniques: "rule.mitre.technique",
      };
      const field = fields[input.kind];
      const aggs: Record<string, unknown> = {
        maxLevel: { max: { field: "rule.level" } },
        agents: { cardinality: { field: "agent.id" } },
      };
      if (input.kind === "rules") aggs.label = { terms: { field: "rule.description", size: 1 } };
      if (input.kind === "agents") aggs.detail = { terms: { field: "agent.id", size: 1 } };
      if (input.kind === "mitreTechniques") aggs.detail = { terms: { field: "rule.mitre.id", size: 6 } };
      const response = await this.searchAsync(
        http,
        "wazuh-alerts-*",
        {
          size: 0,
          track_total_hits: true,
          query: {
            bool: {
              filter: [
                { range: { timestamp: { gte: `now-${input.range}` } } },
                ...(input.minLevel > 0 ? [{ range: { "rule.level": { gte: input.minLevel } } }] : []),
              ],
            },
          },
          aggs: { top: { terms: { field, size: input.limit }, aggs }, withField: { filter: { exists: { field } } } },
        },
        noSource,
        z.object({
          top: z.object({
            buckets: z.array(
              wazuhBucketSchema.extend({
                maxLevel: wazuhNullableValueSchema,
                agents: wazuhValueSchema,
                label: wazuhBucketsSchema.optional(),
                detail: wazuhBucketsSchema.optional(),
              }),
            ),
            sum_other_doc_count: z.number(),
          }),
          withField: z.object({ doc_count: z.number() }),
        }),
      );
      const entries = (response.aggregations?.top.buckets ?? []).map((bucket): WazuhTopListEntry => {
        let label = bucket.key;
        let detail: string | null = null;
        if (input.kind === "rules") {
          label = bucket.label?.buckets[0]?.key ?? bucket.key;
          detail = bucket.key;
        } else if (input.kind === "agents") detail = bucket.detail?.buckets[0]?.key ?? null;
        else if (input.kind === "mitreTechniques")
          detail = bucket.detail?.buckets.find((candidate) => candidate.doc_count === bucket.doc_count)?.key ?? null;
        return {
          key: bucket.key,
          label,
          detail,
          count: bucket.doc_count,
          maxLevel: bucket.maxLevel.value,
          agents: input.kind === "agents" ? null : bucket.agents.value,
        };
      });
      return {
        kind: input.kind,
        range: input.range,
        total: response.aggregations?.withField.doc_count ?? getTotalHits(response.hits.total),
        others: response.aggregations?.top.sum_other_doc_count ?? 0,
        entries,
      };
    });
  }

  async getSecuritySummaryAsync(input: { range: WazuhTimeRange }): Promise<WazuhSecuritySummary> {
    return this.runAsync(async (http) => {
      const { api, indexer } = this.endpoints();
      const [periods, managerVersion, indexerHealth] = await settleSpecialistTasksAsync([
        indexer ? this.periodsAsync(http, input.range) : Promise.resolve(null),
        api
          ? this.apiAsync(http, "/manager/info", wazuhItemsSchema(z.object({ version: z.string().optional() })))
              .then((value) => value.affected_items[0]?.version ?? null)
              .catch((error: unknown) => {
                this.requireOptionalProviderFailure(error);
                this.resources.context.signal.throwIfAborted();
                this.resources.log?.write("warn", "Failed to read Wazuh manager info", {});
                return null;
              })
          : Promise.resolve(null),
        indexer
          ? this.requestAsync(
              http,
              "indexer",
              `${indexer.url}/_cluster/health`,
              { headers: { Authorization: basicAuth(indexer.username, indexer.password) } },
              async (response) => {
                if (!response.ok) throw new IntegrationTransportStatusError(response.status);
                return (
                  z.object({ status: z.enum(["green", "yellow", "red"]).optional() }).parse(await response.json())
                    .status ?? null
                );
              },
            ).catch((error: unknown) => {
              this.requireOptionalProviderFailure(error);
              this.resources.context.signal.throwIfAborted();
              return null;
            })
          : Promise.resolve(null),
      ] as const);
      if (!indexer && !api) throw new WazuhProtocolError(null, "unauthorized");
      if (!indexer && managerVersion === null) throw new WazuhProtocolError("indexer", "indexerRequired");
      return {
        range: input.range,
        alerts: periods?.current ?? null,
        previousAlerts: periods?.previous ?? null,
        maxLevel: periods?.maxLevel ?? null,
        managerVersion,
        indexerHealth,
      };
    });
  }

  private requireOptionalProviderFailure(error: unknown): void {
    if (error instanceof SpecialistNonDegradableError) throw error;
    if (this.resources.context.signal.aborted)
      throw new SpecialistNonDegradableError("cancellation", [error, this.resources.context.signal.reason]);
    if (
      error instanceof WazuhProtocolError &&
      (error.reason === "unauthorized" ||
        error.reason === "status" ||
        error.reason === "invalidResponse" ||
        error.reason === "unreachable" ||
        error.reason === "timeout")
    )
      return;
    throw new SpecialistNonDegradableError("optional-provider", [error]);
  }

  private async periodsAsync(http: SpecialistHttp, range: WazuhTimeRange) {
    const duration = timeRangeMs[range];
    const now = Date.now();
    const response = await this.searchAsync(
      http,
      "wazuh-alerts-*",
      {
        size: 0,
        query: { range: { timestamp: { gte: now - 2 * duration, lt: now, format: "epoch_millis" } } },
        aggs: {
          periods: {
            date_range: {
              field: "timestamp",
              format: "epoch_millis",
              keyed: false,
              ranges: [
                { key: "previous", from: now - 2 * duration, to: now - duration },
                { key: "current", from: now - duration, to: now },
              ],
            },
            aggs: { severity: severityRangeAggregation, maxLevel: { max: { field: "rule.level" } } },
          },
        },
      },
      noSource,
      z.object({
        periods: z.object({
          buckets: z.array(
            wazuhBucketSchema.extend({ severity: wazuhSeveritySchema, maxLevel: wazuhNullableValueSchema }),
          ),
        }),
      }),
    );
    const current = response.aggregations?.periods.buckets.find((bucket) => bucket.key === "current");
    const previous = response.aggregations?.periods.buckets.find((bucket) => bucket.key === "previous");
    return {
      current: toSeverityCounts(current?.severity, current?.doc_count ?? 0),
      previous: toSeverityCounts(previous?.severity, previous?.doc_count ?? 0),
      maxLevel: current?.maxLevel.value ?? null,
    };
  }

  async getVulnerabilitiesAsync(input: {
    cveLimit: number;
    agentLimit: number;
    cveOrder: WazuhCveOrder;
    minSeverity: "all" | "medium" | "high" | "critical";
  }): Promise<WazuhVulnerabilityOverview> {
    return this.runAsync(async (http) => {
      const severityFilters: Record<typeof input.minSeverity, string[] | null> = {
        all: null,
        medium: ["Medium", "High", "Critical"],
        high: ["High", "Critical"],
        critical: ["Critical"],
      };
      const severities = severityFilters[input.minSeverity];
      const response = await this.searchAsync(
        http,
        "wazuh-states-vulnerabilities-*",
        {
          size: 0,
          track_total_hits: true,
          aggs: {
            severity: { terms: { field: "vulnerability.severity", size: 10, missing: "-" } },
            agents: { cardinality: { field: "agent.id" } },
            cves: {
              filter: severities ? { terms: { "vulnerability.severity": severities } } : { match_all: {} },
              aggs: {
                top: {
                  terms: {
                    field: "vulnerability.id",
                    size: input.cveLimit,
                    order:
                      input.cveOrder === "score"
                        ? [{ maxScore: "desc" }, { agents: "desc" }]
                        : [{ agents: "desc" }, { maxScore: "desc" }],
                  },
                  aggs: {
                    maxScore: { max: { field: "vulnerability.score.base" } },
                    agents: { cardinality: { field: "agent.id" } },
                    severity: { terms: { field: "vulnerability.severity", size: 1 } },
                    packages: { terms: { field: "package.name", size: 3 } },
                    reference: { terms: { field: "vulnerability.scanner.reference", size: 1 } },
                  },
                },
              },
            },
            topAgents: {
              terms: {
                field: "agent.id",
                size: input.agentLimit,
                order: [{ critical: "desc" }, { high: "desc" }, { _count: "desc" }],
              },
              aggs: {
                critical: { filter: { term: { "vulnerability.severity": "Critical" } } },
                high: { filter: { term: { "vulnerability.severity": "High" } } },
                name: { terms: { field: "agent.name", size: 1 } },
              },
            },
          },
        },
        noSource,
        z.object({
          severity: wazuhBucketsSchema,
          agents: wazuhValueSchema,
          cves: z.object({
            top: z.object({
              buckets: z.array(
                wazuhBucketSchema.extend({
                  maxScore: wazuhNullableValueSchema,
                  agents: wazuhValueSchema,
                  severity: wazuhBucketsSchema,
                  packages: wazuhBucketsSchema,
                  reference: wazuhBucketsSchema,
                }),
              ),
            }),
          }),
          topAgents: z.object({
            buckets: z.array(
              wazuhBucketSchema.extend({
                critical: z.object({ doc_count: z.number() }),
                high: z.object({ doc_count: z.number() }),
                name: wazuhBucketsSchema,
              }),
            ),
          }),
        }),
      );
      const counts: WazuhVulnerabilityCounts = { critical: 0, high: 0, medium: 0, low: 0, unscored: 0 };
      for (const bucket of response.aggregations?.severity.buckets ?? []) {
        const key = bucket.key.toLowerCase();
        if (key === "critical" || key === "high" || key === "medium" || key === "low") counts[key] += bucket.doc_count;
        else counts.unscored += bucket.doc_count;
      }
      return {
        counts,
        total: getTotalHits(response.hits.total),
        affectedAgents: response.aggregations?.agents.value ?? 0,
        topCves: (response.aggregations?.cves.top.buckets ?? []).map((bucket) => ({
          id: bucket.key,
          severity: bucket.severity.buckets[0]?.key ?? "-",
          score: bucket.maxScore.value,
          agents: bucket.agents.value,
          packages: bucket.packages.buckets.map((pkg) => pkg.key),
          reference: bucket.reference.buckets[0]?.key ?? null,
        })),
        topAgents: (response.aggregations?.topAgents.buckets ?? []).map((bucket) => ({
          id: bucket.key,
          name: bucket.name.buckets[0]?.key ?? bucket.key,
          total: bucket.doc_count,
          critical: bucket.critical.doc_count,
          high: bucket.high.doc_count,
        })),
      };
    });
  }

  async getFimEventsAsync(input: {
    range: WazuhTimeRange;
    event: WazuhFimEventFilter;
    limit: number;
    includeRegistry: boolean;
  }): Promise<WazuhFimOverview> {
    return this.runAsync(async (http) => {
      const response = await this.searchAsync(
        http,
        "wazuh-alerts-*",
        {
          size: input.limit,
          sort: [{ timestamp: { order: "desc" } }],
          _source: [
            "id",
            "timestamp",
            "rule.level",
            "rule.description",
            "rule.groups",
            "agent.id",
            "agent.name",
            "syscheck.path",
            "syscheck.event",
            "syscheck.value_name",
            "syscheck.uname_after",
            "syscheck.audit.user.name",
          ],
          query: {
            bool: {
              filter: [
                { term: { "rule.groups": "syscheck" } },
                { range: { timestamp: { gte: `now-${input.range}` } } },
              ],
              must_not: input.includeRegistry ? [] : [{ term: { "rule.groups": "syscheck_registry" } }],
            },
          },
          ...(input.event !== "all" ? { post_filter: { term: { "syscheck.event": input.event } } } : {}),
          aggs: { events: { terms: { field: "syscheck.event", size: 5 } } },
        },
        wazuhAlertSourceSchema,
        z.object({ events: wazuhBucketsSchema }),
      );
      const counts: Record<WazuhFimEvent, number> = { added: 0, modified: 0, deleted: 0 };
      for (const bucket of response.aggregations?.events.buckets ?? [])
        if (bucket.key === "added" || bucket.key === "modified" || bucket.key === "deleted")
          counts[bucket.key] = bucket.doc_count;
      return {
        range: input.range,
        counts,
        entries: response.hits.hits.map((hit) => {
          const source = hit._source;
          const event = source.syscheck?.event;
          return {
            id: hit._id,
            alertId: source.id ?? null,
            timestamp: source.timestamp ?? new Date(0).toISOString(),
            event: event === "added" || event === "modified" || event === "deleted" ? event : "unknown",
            path: source.syscheck?.path ?? "",
            valueName: source.syscheck?.value_name ?? null,
            isRegistry: source.rule?.groups?.includes("syscheck_registry") ?? false,
            agentId: source.agent?.id ?? null,
            agentName: source.agent?.name ?? null,
            level: source.rule?.level ?? 0,
            description: source.rule?.description ?? "",
            user: source.syscheck?.uname_after ?? source.syscheck?.audit?.user?.name ?? null,
          };
        }),
      };
    });
  }

  async getAuthFailuresAsync(input: { hours: number; limit: number }): Promise<WazuhAuthFailures> {
    return this.runAsync(async (http) => {
      const bucketHours = Math.max(1, Math.ceil(input.hours / 24));
      const bucketMs = bucketHours * 60 * 60 * 1000;
      const end = Math.ceil(Date.now() / bucketMs) * bucketMs;
      const start = end - Math.ceil(input.hours / bucketHours) * bucketMs;
      const histogram = {
        date_histogram: {
          field: "timestamp",
          fixed_interval: `${bucketHours}h`,
          min_doc_count: 0,
          extended_bounds: { min: start, max: end - bucketMs },
        },
      };
      const numericBuckets = z.object({ buckets: z.array(wazuhNumericBucketSchema) });
      const response = await this.searchAsync(
        http,
        "wazuh-alerts-*",
        {
          size: 0,
          track_total_hits: true,
          query: {
            bool: {
              filter: [{ range: { timestamp: { gte: start, lt: end, format: "epoch_millis" } } }, authFailureQuery],
            },
          },
          aggs: {
            bruteForce: { filter: bruteForceQuery },
            sourceIps: { cardinality: { field: "data.srcip" } },
            series: histogram,
            agents: {
              terms: { field: "agent.name", size: input.limit },
              aggs: {
                bruteForce: { filter: bruteForceQuery },
                id: { terms: { field: "agent.id", size: 1 } },
                series: histogram,
                sourceIps: { terms: { field: "data.srcip", size: 3 } },
                lastSeen: { max: { field: "timestamp" } },
              },
            },
          },
        },
        noSource,
        z.object({
          bruteForce: z.object({ doc_count: z.number() }),
          sourceIps: wazuhValueSchema,
          series: numericBuckets,
          agents: z.object({
            buckets: z.array(
              wazuhBucketSchema.extend({
                bruteForce: z.object({ doc_count: z.number() }),
                id: wazuhBucketsSchema,
                series: numericBuckets,
                sourceIps: wazuhBucketsSchema,
                lastSeen: wazuhNullableValueSchema.extend({ value_as_string: z.string().optional() }),
              }),
            ),
          }),
        }),
      );
      const total = getTotalHits(response.hits.total);
      const bruteForce = response.aggregations?.bruteForce.doc_count ?? 0;
      return {
        hours: input.hours,
        totals: {
          total,
          bruteForce,
          failed: total - bruteForce,
          sourceIps: response.aggregations?.sourceIps.value ?? 0,
        },
        series: (response.aggregations?.series.buckets ?? []).map((bucket) => bucket.doc_count),
        agents: (response.aggregations?.agents.buckets ?? []).map((bucket) => ({
          agentId: bucket.id.buckets[0]?.key ?? null,
          agentName: bucket.key,
          total: bucket.doc_count,
          bruteForce: bucket.bruteForce.doc_count,
          failed: bucket.doc_count - bucket.bruteForce.doc_count,
          series: bucket.series.buckets.map((point) => point.doc_count),
          topSourceIps: bucket.sourceIps.buckets.map((ip) => ({ ip: ip.key, count: ip.doc_count })),
          lastSeen: bucket.lastSeen.value !== null ? new Date(bucket.lastSeen.value).toISOString() : null,
        })),
      };
    });
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const http = this.testingHttp(input);
    const { api, indexer } = this.endpoints();
    try {
      if (api) await this.authenticateAsync(http);
      if (indexer) await this.searchAsync(http, "wazuh-alerts-*", { size: 0 }, noSource, z.unknown());
    } catch (error) {
      if (error instanceof SpecialistNonDegradableError) throw error;
      this.resources.context.signal.throwIfAborted();
      if (error instanceof WazuhProtocolError) {
        if (error.reason === "unauthorized") return TestConnectionError.UnauthorizedResult(error.status ?? 401);
        if (error.reason === "status" && error.status !== undefined)
          return TestConnectionError.StatusResult({
            status: error.status,
            url: error.target === "indexer" ? (indexer?.url ?? this.integration.url) : this.integration.url,
          });
      }
      if (error instanceof WazuhProtocolError && error.cause instanceof IntegrationTransportRequestError)
        throw error.cause;
      throw error;
    }
    return !api && !indexer ? TestConnectionError.UnauthorizedResult(401) : { success: true };
  }
}
