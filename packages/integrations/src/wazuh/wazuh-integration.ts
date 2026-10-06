import { removeTrailingSlash } from "@homarr/common";
import { FetchHttpErrorHandler } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import type { fetch as undiciFetch } from "undici";

import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { IntegrationRequestError } from "../base/errors/http/integration-request-error";
import type { SessionStore } from "../base/session-store";
import { createSessionStore } from "../base/session-store";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../http-auth";
import { WazuhRequestError } from "./wazuh-errors";
import type { KeyedBucket, SeverityRangeResult } from "./wazuh-queries";
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
} from "./wazuh-queries";
import type {
  WazuhAgent,
  WazuhAgentCounts,
  WazuhAgentsOverview,
  WazuhAlert,
  WazuhAlertTimeline,
  WazuhApiAgent,
  WazuhApiAgentsSummaryStatus,
  WazuhApiItems,
  WazuhApiResponse,
  WazuhAuthFailures,
  WazuhCveOrder,
  WazuhDataSource,
  WazuhFimEvent,
  WazuhFimEventFilter,
  WazuhFimOverview,
  WazuhIndexerAlertSource,
  WazuhIndexerMonitoringSource,
  WazuhIndexerSearchResponse,
  WazuhSecuritySummary,
  WazuhTimelineInterval,
  WazuhTimeRange,
  WazuhTopList,
  WazuhTopListEntry,
  WazuhTopListKind,
  WazuhVulnerabilityCounts,
  WazuhVulnerabilityOverview,
} from "./wazuh-types";

const logger = createLogger({ module: "wazuhIntegration" });

const REQUEST_TIMEOUT_MS = 15_000;
/** The Wazuh API issues 900 second tokens by default; refresh well before that. */
const TOKEN_TTL_SECONDS = 600;
/** Agent snapshots in wazuh-monitoring-* are written as one batch that spans a few milliseconds. */
const MONITORING_SNAPSHOT_WINDOW_MS = 5 * 60 * 1000;
/** Upper bound for agent lists; larger fleets should use the Wazuh dashboard. */
const MAX_AGENTS = 1000;

interface WazuhSession {
  token: string;
}

type FetchLike = typeof undiciFetch;

interface WazuhEndpoints {
  api: { url: string; username: string; password: string } | null;
  indexer: { url: string; username: string; password: string } | null;
}

const findWazuhRequestError = (error: unknown): WazuhRequestError | null => {
  let current: unknown = error;
  for (let depth = 0; depth < 8 && current; depth++) {
    if (current instanceof WazuhRequestError) return current;
    current = current instanceof Error ? current.cause : undefined;
  }
  return null;
};

const fetchHttpErrorHandler = new FetchHttpErrorHandler();

const basicAuth = (username: string, password: string) =>
  `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

export class WazuhIntegration extends Integration {
  private readonly sessionStore: SessionStore<WazuhSession>;

  constructor(integration: IntegrationInput) {
    super(integration);
    this.sessionStore = createSessionStore(integration);
  }

  /**
   * Credential alternatives:
   * - username + password: the integration URL is the Wazuh server API (default port 55000).
   * - username + password + indexer URL/credentials: server API plus the indexer for alerts.
   * - indexer username + password only: the integration URL is the Wazuh indexer (default port 9200).
   */
  private getEndpoints(): WazuhEndpoints {
    const hasApi = this.hasSecretValue("username") && this.hasSecretValue("password");
    const hasIndexerCredentials =
      this.hasSecretValue("wazuhIndexerUsername") && this.hasSecretValue("wazuhIndexerPassword");

    const api = hasApi
      ? {
          url: removeTrailingSlash(this.integration.url),
          username: this.getSecretValue("username"),
          password: this.getSecretValue("password"),
        }
      : null;

    let indexerUrl: string | null = null;
    if (hasIndexerCredentials) {
      if (this.hasSecretValue("wazuhIndexerUrl")) indexerUrl = this.getSecretValue("wazuhIndexerUrl");
      else if (!hasApi) indexerUrl = this.integration.url;
    }

    const indexer =
      indexerUrl !== null
        ? {
            url: removeTrailingSlash(indexerUrl),
            username: this.getSecretValue("wazuhIndexerUsername"),
            password: this.getSecretValue("wazuhIndexerPassword"),
          }
        : null;

    return { api, indexer };
  }

  public get hasIndexer() {
    return this.getEndpoints().indexer !== null;
  }

  public override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    const { api, indexer } = this.getEndpoints();
    if (api) {
      const token = await this.getApiTokenAsync();
      return { headers: { Authorization: `Bearer ${token}` }, redactValues: [token] };
    }
    if (indexer) {
      const header = basicAuth(indexer.username, indexer.password);
      return { headers: { Authorization: header }, redactValues: [header, indexer.password] };
    }
    throw new Error("Wazuh integration has no usable credentials");
  }

  // ---------------------------------------------------------------------------------------------
  // Low level requests
  // ---------------------------------------------------------------------------------------------

  private async requestAsync(
    target: WazuhDataSource,
    url: string,
    init: { method?: string; headers?: Record<string, string>; body?: string },
    fetchAsync?: FetchLike,
  ) {
    const start = performance.now();
    try {
      const response = fetchAsync
        ? await fetchAsync(url, {
            ...init,
            redirect: "error",
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          })
        : await fetchWithTrustedCertificatesAsync(url, { ...init, redirect: "error", timeout: REQUEST_TIMEOUT_MS });
      logger.debug("Wazuh response", {
        integrationId: this.integration.id,
        target,
        path: new URL(url).pathname,
        status: response.status,
        durationMs: Math.round(performance.now() - start),
      });
      return response;
    } catch (error) {
      throw WazuhRequestError.fromFetchError(target, error);
    }
  }

  private async authenticateApiAsync(fetchAsync?: FetchLike): Promise<string> {
    const { api } = this.getEndpoints();
    if (!api) throw new WazuhRequestError("api", "unauthorized");

    const response = await this.requestAsync(
      "api",
      `${api.url}/security/user/authenticate?raw=true`,
      { method: "POST", headers: { Authorization: basicAuth(api.username, api.password) } },
      fetchAsync,
    );
    if (!response.ok) throw WazuhRequestError.fromResponse("api", response);

    const token = (await response.text()).trim();
    if (!token || token.startsWith("{")) throw new WazuhRequestError("api", "invalidResponse");
    return token;
  }

  private async getApiTokenAsync(): Promise<string> {
    const existing = await this.sessionStore.getAsync();
    if (existing) return existing.token;

    const token = await this.authenticateApiAsync();
    await this.sessionStore.setAsync({ token }, { ttlSeconds: TOKEN_TTL_SECONDS });
    return token;
  }

  private async apiGetAsync<TData>(path: `/${string}`, query?: Record<string, string | number>): Promise<TData> {
    const { api } = this.getEndpoints();
    if (!api) throw new WazuhRequestError("api", "unauthorized");

    const url = new URL(`${api.url}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, String(value));

    const doRequest = async (token: string) =>
      await this.requestAsync("api", url.toString(), { headers: { Authorization: `Bearer ${token}` } });

    let response = await doRequest(await this.getApiTokenAsync());
    if (response.status === 401) {
      await this.sessionStore.clearAsync();
      response = await doRequest(await this.getApiTokenAsync());
    }
    if (!response.ok) throw WazuhRequestError.fromResponse("api", response);

    const body = (await response.json()) as WazuhApiResponse<TData>;
    if (typeof body !== "object" || !("data" in body)) throw new WazuhRequestError("api", "invalidResponse");
    return body.data;
  }

  private async indexerSearchAsync<TSource, TAggregations = undefined>(
    indexPattern: string,
    query: Record<string, unknown>,
    fetchAsync?: FetchLike,
  ): Promise<WazuhIndexerSearchResponse<TSource, TAggregations>> {
    const { indexer } = this.getEndpoints();
    if (!indexer) throw new WazuhRequestError("indexer", "indexerRequired");

    const response = await this.requestAsync(
      "indexer",
      `${indexer.url}/${indexPattern}/_search?ignore_unavailable=true&allow_no_indices=true`,
      {
        method: "POST",
        headers: {
          Authorization: basicAuth(indexer.username, indexer.password),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(query),
      },
      fetchAsync,
    );
    if (!response.ok) throw WazuhRequestError.fromResponse("indexer", response);
    return (await response.json()) as WazuhIndexerSearchResponse<TSource, TAggregations>;
  }

  private async indexerGetAsync<TData>(path: `/${string}`): Promise<TData> {
    const { indexer } = this.getEndpoints();
    if (!indexer) throw new WazuhRequestError("indexer", "indexerRequired");
    const response = await this.requestAsync("indexer", `${indexer.url}${path}`, {
      headers: { Authorization: basicAuth(indexer.username, indexer.password) },
    });
    if (!response.ok) throw WazuhRequestError.fromResponse("indexer", response);
    return (await response.json()) as TData;
  }

  // ---------------------------------------------------------------------------------------------
  // Dashboard links
  // ---------------------------------------------------------------------------------------------

  /**
   * Base URL of the Wazuh dashboard used for deep links. Prefers the optional "Dashboard URL" field and falls back
   * to the linked app, as long as that app does not simply point at the API/indexer URL.
   */
  public getDashboardUrl(): string | null {
    if (this.hasSecretValue("wazuhDashboardUrl")) {
      return removeTrailingSlash(this.getSecretValue("wazuhDashboardUrl"));
    }
    const external = this.integration.externalUrl;
    if (external && removeTrailingSlash(external) !== removeTrailingSlash(this.integration.url)) {
      return removeTrailingSlash(external);
    }
    return null;
  }

  // ---------------------------------------------------------------------------------------------
  // Agents
  // ---------------------------------------------------------------------------------------------

  public async getAgentsOverviewAsync(): Promise<WazuhAgentsOverview> {
    const { api } = this.getEndpoints();
    if (api) return await this.getAgentsOverviewFromApiAsync();
    return await this.getAgentsOverviewFromIndexerAsync();
  }

  private async getAgentsOverviewFromApiAsync(): Promise<WazuhAgentsOverview> {
    const [summary, agents] = await Promise.all([
      this.apiGetAsync<WazuhApiAgentsSummaryStatus>("/agents/summary/status"),
      this.apiGetAsync<WazuhApiItems<WazuhApiAgent>>("/agents", {
        select: "id,name,ip,status,version,lastKeepAlive,group,os.name,os.version,os.platform",
        sort: "+name",
        limit: MAX_AGENTS,
      }),
    ]);

    const connection = summary.connection ?? {};
    const counts: WazuhAgentCounts = {
      active: connection.active ?? 0,
      disconnected: connection.disconnected ?? 0,
      neverConnected: connection.never_connected ?? 0,
      pending: connection.pending ?? 0,
      total: connection.total ?? 0,
    };

    return {
      source: "api",
      asOf: new Date().toISOString(),
      counts,
      agents: agents.affected_items
        // Agent 000 is the manager itself; the Wazuh dashboard hides it from the agent list as well.
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

  private async getAgentsOverviewFromIndexerAsync(): Promise<WazuhAgentsOverview> {
    const latest = await this.indexerSearchAsync<never, { latest: { value: number | null } }>("wazuh-monitoring-*", {
      size: 0,
      aggs: { latest: { max: { field: "timestamp" } } },
    });
    const latestTimestamp = latest.aggregations?.latest.value;
    const counts: WazuhAgentCounts = { total: 0, active: 0, disconnected: 0, neverConnected: 0, pending: 0 };
    if (!latestTimestamp) {
      return { source: "indexer", asOf: new Date().toISOString(), counts, agents: [] };
    }

    const snapshot = await this.indexerSearchAsync<WazuhIndexerMonitoringSource>("wazuh-monitoring-*", {
      size: MAX_AGENTS,
      sort: [{ timestamp: { order: "desc" } }],
      _source: ["id", "name", "ip", "status", "version", "lastKeepAlive", "timestamp", "group", "os"],
      query: {
        range: {
          timestamp: {
            gte: new Date(latestTimestamp - MONITORING_SNAPSHOT_WINDOW_MS).toISOString(),
            lte: new Date(latestTimestamp).toISOString(),
          },
        },
      },
    });

    // Keep the newest document per agent in case the window overlaps two snapshots.
    const agents = new Map<string, WazuhAgent>();
    for (const hit of snapshot.hits.hits) {
      const source = hit._source;
      const id = source.id;
      if (!id || id === "000" || agents.has(id)) continue;
      agents.set(id, {
        id,
        name: source.name ?? id,
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
      asOf: new Date(latestTimestamp).toISOString(),
      counts,
      agents: [...agents.values()].toSorted((left, right) => left.name.localeCompare(right.name)),
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Alerts (indexer only, the server API has no alert search)
  // ---------------------------------------------------------------------------------------------

  public async getRecentAlertsAsync(input: { minLevel: number; limit: number; hours: number }): Promise<WazuhAlert[]> {
    const response = await this.indexerSearchAsync<WazuhIndexerAlertSource>("wazuh-alerts-*", {
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
    });

    return response.hits.hits.map(mapAlertHit);
  }

  public async getAlertTimelineAsync(input: {
    range: WazuhTimeRange;
    interval: WazuhTimelineInterval;
    minLevel: number;
  }): Promise<WazuhAlertTimeline> {
    const intervalMs = resolveTimelineIntervalMs(input.range, input.interval);
    const now = Date.now();
    // Query exactly the selected window (so totals match the summary widget) but align the buckets to the
    // interval so they stay stable across refreshes. The first and last buckets can therefore be partial.
    const windowStart = now - timeRangeMs[input.range];
    const end = Math.ceil(now / intervalMs) * intervalMs;
    const start = Math.floor(windowStart / intervalMs) * intervalMs;

    const response = await this.indexerSearchAsync<
      never,
      {
        timeline: { buckets: (KeyedBucket<number> & { severity: SeverityRangeResult })[] };
        severity: SeverityRangeResult;
      }
    >("wazuh-alerts-*", {
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
    });

    const buckets = response.aggregations?.timeline.buckets ?? [];
    return {
      range: input.range,
      intervalMs,
      totals: toSeverityCounts(response.aggregations?.severity, getTotalHits(response.hits.total)),
      points: buckets.map((bucket) => {
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
  }

  public async getTopListAsync(input: {
    kind: WazuhTopListKind;
    range: WazuhTimeRange;
    limit: number;
    minLevel: number;
  }): Promise<WazuhTopList> {
    const fields: Record<WazuhTopListKind, string> = {
      rules: "rule.id",
      agents: "agent.name",
      sourceIps: "data.srcip",
      mitreTactics: "rule.mitre.tactic",
      mitreTechniques: "rule.mitre.technique",
    };
    const field = fields[input.kind];

    const subAggregations: Record<string, unknown> = {
      maxLevel: { max: { field: "rule.level" } },
      agents: { cardinality: { field: "agent.id" } },
    };
    if (input.kind === "rules") subAggregations.label = { terms: { field: "rule.description", size: 1 } };
    if (input.kind === "agents") subAggregations.detail = { terms: { field: "agent.id", size: 1 } };
    if (input.kind === "mitreTechniques") subAggregations.detail = { terms: { field: "rule.mitre.id", size: 6 } };

    type TopBucket = KeyedBucket & {
      maxLevel: { value: number | null };
      agents: { value: number };
      label?: { buckets: KeyedBucket[] };
      detail?: { buckets: KeyedBucket[] };
    };

    const response = await this.indexerSearchAsync<
      never,
      { top: { buckets: TopBucket[]; sum_other_doc_count: number }; withField: { doc_count: number } }
    >("wazuh-alerts-*", {
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
      aggs: {
        top: { terms: { field, size: input.limit }, aggs: subAggregations },
        withField: { filter: { exists: { field } } },
      },
    });

    const buckets = response.aggregations?.top.buckets ?? [];
    const entries = buckets.map((bucket): WazuhTopListEntry => {
      let label = bucket.key;
      let detail: string | null = null;
      if (input.kind === "rules") {
        label = bucket.label?.buckets[0]?.key ?? bucket.key;
        detail = bucket.key;
      } else if (input.kind === "agents") {
        detail = bucket.detail?.buckets[0]?.key ?? null;
      } else if (input.kind === "mitreTechniques") {
        // Technique names and ids are parallel arrays; the id that always co-occurs with the name belongs to it.
        detail = bucket.detail?.buckets.find((candidate) => candidate.doc_count === bucket.doc_count)?.key ?? null;
      }
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
  }

  // ---------------------------------------------------------------------------------------------
  // Security summary (severity breakdown with trend)
  // ---------------------------------------------------------------------------------------------

  public async getSecuritySummaryAsync(input: { range: WazuhTimeRange }): Promise<WazuhSecuritySummary> {
    const { api, indexer } = this.getEndpoints();

    const [periods, managerVersion, indexerHealth] = await Promise.all([
      indexer ? this.getAlertPeriodsAsync(input.range) : Promise.resolve(null),
      api
        ? this.apiGetAsync<WazuhApiItems<{ version?: string }>>("/manager/info")
            .then((data) => data.affected_items[0]?.version ?? null)
            .catch((error: unknown) => {
              logger.warn("Failed to read Wazuh manager info", {
                integrationId: this.integration.id,
                error: String(error),
              });
              return null;
            })
        : Promise.resolve(null),
      indexer
        ? this.indexerGetAsync<{ status?: "green" | "yellow" | "red" }>("/_cluster/health")
            .then((data) => data.status ?? null)
            // Restricted indexer users may not read cluster health; that must not break the widget.
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    if (!indexer && !api) throw new WazuhRequestError(null, "unauthorized");
    if (!indexer && managerVersion === null) throw new WazuhRequestError("indexer", "indexerRequired");

    return {
      range: input.range,
      alerts: periods?.current ?? null,
      previousAlerts: periods?.previous ?? null,
      maxLevel: periods?.maxLevel ?? null,
      managerVersion,
      indexerHealth,
    };
  }

  private async getAlertPeriodsAsync(range: WazuhTimeRange) {
    const duration = timeRangeMs[range];
    const now = Date.now();
    type PeriodBucket = KeyedBucket & { severity: SeverityRangeResult; maxLevel: { value: number | null } };
    const response = await this.indexerSearchAsync<never, { periods: { buckets: PeriodBucket[] } }>("wazuh-alerts-*", {
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
    });

    const find = (key: string) => response.aggregations?.periods.buckets.find((bucket) => bucket.key === key);
    const current = find("current");
    const previous = find("previous");
    return {
      current: toSeverityCounts(current?.severity, current?.doc_count ?? 0),
      previous: toSeverityCounts(previous?.severity, previous?.doc_count ?? 0),
      maxLevel: current?.maxLevel.value ?? null,
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Vulnerabilities (wazuh-states-vulnerabilities-*, Wazuh 4.8+)
  // ---------------------------------------------------------------------------------------------

  public async getVulnerabilitiesAsync(input: {
    cveLimit: number;
    agentLimit: number;
    cveOrder: WazuhCveOrder;
    minSeverity: "all" | "medium" | "high" | "critical";
  }): Promise<WazuhVulnerabilityOverview> {
    const severityFilters: Record<typeof input.minSeverity, string[] | null> = {
      all: null,
      medium: ["Medium", "High", "Critical"],
      high: ["High", "Critical"],
      critical: ["Critical"],
    };
    const cveSeverities = severityFilters[input.minSeverity];

    type CveBucket = KeyedBucket & {
      maxScore: { value: number | null };
      agents: { value: number };
      severity: { buckets: KeyedBucket[] };
      packages: { buckets: KeyedBucket[] };
      reference: { buckets: KeyedBucket[] };
    };
    type AgentBucket = KeyedBucket & {
      critical: { doc_count: number };
      high: { doc_count: number };
      name: { buckets: KeyedBucket[] };
    };

    const response = await this.indexerSearchAsync<
      never,
      {
        severity: { buckets: KeyedBucket[] };
        agents: { value: number };
        cves: { top: { buckets: CveBucket[] } };
        topAgents: { buckets: AgentBucket[] };
      }
    >("wazuh-states-vulnerabilities-*", {
      size: 0,
      track_total_hits: true,
      aggs: {
        severity: { terms: { field: "vulnerability.severity", size: 10, missing: "-" } },
        agents: { cardinality: { field: "agent.id" } },
        cves: {
          filter: cveSeverities ? { terms: { "vulnerability.severity": cveSeverities } } : { match_all: {} },
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
    });

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
  }

  // ---------------------------------------------------------------------------------------------
  // File integrity monitoring (syscheck alerts)
  // ---------------------------------------------------------------------------------------------

  public async getFimEventsAsync(input: {
    range: WazuhTimeRange;
    event: WazuhFimEventFilter;
    limit: number;
    includeRegistry: boolean;
  }): Promise<WazuhFimOverview> {
    const response = await this.indexerSearchAsync<WazuhIndexerAlertSource, { events: { buckets: KeyedBucket[] } }>(
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
            filter: [{ term: { "rule.groups": "syscheck" } }, { range: { timestamp: { gte: `now-${input.range}` } } }],
            must_not: input.includeRegistry ? [] : [{ term: { "rule.groups": "syscheck_registry" } }],
          },
        },
        // The event filter only narrows the list; the counts in the header always show all three events.
        ...(input.event !== "all" ? { post_filter: { term: { "syscheck.event": input.event } } } : {}),
        aggs: { events: { terms: { field: "syscheck.event", size: 5 } } },
      },
    );

    const counts: Record<WazuhFimEvent, number> = { added: 0, modified: 0, deleted: 0 };
    for (const bucket of response.aggregations?.events.buckets ?? []) {
      if (bucket.key === "added" || bucket.key === "modified" || bucket.key === "deleted") {
        counts[bucket.key] = bucket.doc_count;
      }
    }

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
  }

  // ---------------------------------------------------------------------------------------------
  // Authentication failures / brute force
  // ---------------------------------------------------------------------------------------------

  public async getAuthFailuresAsync(input: { hours: number; limit: number }): Promise<WazuhAuthFailures> {
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

    type AgentBucket = KeyedBucket & {
      bruteForce: { doc_count: number };
      id: { buckets: KeyedBucket[] };
      series: { buckets: KeyedBucket<number>[] };
      sourceIps: { buckets: KeyedBucket[] };
      lastSeen: { value: number | null; value_as_string?: string };
    };

    const response = await this.indexerSearchAsync<
      never,
      {
        bruteForce: { doc_count: number };
        sourceIps: { value: number };
        series: { buckets: KeyedBucket<number>[] };
        agents: { buckets: AgentBucket[] };
      }
    >("wazuh-alerts-*", {
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
    });

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
  }

  // ---------------------------------------------------------------------------------------------
  // Test connection
  // ---------------------------------------------------------------------------------------------

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const { api, indexer } = this.getEndpoints();

    try {
      if (api) {
        await this.authenticateApiAsync(input.fetchAsync);
      }
      if (indexer) {
        // A secondary indexer URL may live on another host; it is checked with the same trust settings.
        await this.indexerSearchAsync("wazuh-alerts-*", { size: 0 }, input.fetchAsync);
      }
    } catch (thrown) {
      // Methods are wrapped by the integration error decorator, so the Wazuh error may sit in the cause chain.
      const error = findWazuhRequestError(thrown) ?? thrown;
      if (error instanceof WazuhRequestError) {
        if (error.reason === "unauthorized") return TestConnectionError.UnauthorizedResult(error.status ?? 401);
        const url = error.target === "indexer" ? (indexer?.url ?? this.integration.url) : this.integration.url;
        if (error.reason === "status" && error.status !== undefined) {
          return TestConnectionError.StatusResult({ status: error.status, url });
        }
        // Report TLS and network failures with the URL of the endpoint that failed. The shared test-connection
        // flow then reads and offers to trust the certificate of that endpoint (API or indexer), not always the
        // certificate of the integration URL.
        const requestError = fetchHttpErrorHandler.handleRequestError(error.cause);
        if (requestError) throw new IntegrationRequestError(this.publicIntegration, { cause: requestError, url });
        if (error.cause !== undefined) throw error.cause;
      }
      throw error;
    }

    if (!api && !indexer) return TestConnectionError.UnauthorizedResult(401);
    return { success: true };
  }
}
