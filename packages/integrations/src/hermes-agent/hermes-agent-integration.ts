import type { z } from "zod/v4";

import { env } from "@homarr/common/env";
import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type {
  HermesAgentOverview,
  HermesDashboardStatus,
  HermesSession,
  HermesSessionsPage,
  HermesUpdateStatus,
} from "./hermes-agent-types";
import {
  hermesApiHealthSchema,
  hermesCapabilitiesSchema,
  hermesCompareSchema,
  hermesDashboardStatusSchema,
  hermesDashboardUpdateSchema,
  hermesDetailedHealthSchema,
  hermesJobsResponseSchema,
  parseHermesTimestamp,
  hermesReleaseSchema,
  hermesReleaseTagSchema,
  hermesSessionsResponseSchema,
  hermesSkillsResponseSchema,
  hermesToolsetsResponseSchema,
} from "./hermes-agent-types";

const logger = createLogger({ module: "hermesAgentIntegration" });

const githubHeaders = {
  Accept: "application/vnd.github+json",
  "User-Agent": "Homarr Hermes Agent integration",
} satisfies Record<string, string>;

const githubUpdateCacheDurationMs = 60 * 60 * 1000;
const githubUpdateCacheMaxEntries = 32;
const requestTimeoutMs = 10_000;
const sessionFetchLimit = 100;
const dashboardProfileRequestConcurrency = 4;
const githubUpdateCache = new Map<
  string,
  {
    expiresAt: number;
    promise: Promise<HermesUpdateStatus | null>;
  }
>();

export class HermesAgentIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const healthResponse = await input.fetchAsync(this.url("/health"), {
      headers: { Accept: "application/json" },
    });
    const healthData = healthResponse.ok ? await healthResponse.json().catch(() => null) : null;
    const isApiServer = hermesApiHealthSchema.safeParse(healthData).success;

    if (!isApiServer) {
      const dashboardStatusResponse = await input.fetchAsync(this.url("/api/status"), {
        headers: { Accept: "application/json" },
      });

      if (!dashboardStatusResponse.ok) {
        throw new ResponseError(healthResponse.ok ? dashboardStatusResponse : healthResponse);
      }

      hermesDashboardStatusSchema.parse(await dashboardStatusResponse.json());
      return { success: true };
    }

    const capabilitiesResponse = await input.fetchAsync(this.url("/v1/capabilities"), {
      headers: this.getAuthHeaders(),
    });

    if (!capabilitiesResponse.ok) {
      throw new ResponseError(capabilitiesResponse);
    }

    hermesCapabilitiesSchema.parse(await capabilitiesResponse.json());

    return { success: true };
  }

  public async getOverviewAsync(): Promise<HermesAgentOverview> {
    if (await this.isApiServerAsync()) {
      return await this.getApiServerOverviewAsync();
    }

    return await this.getDashboardOverviewAsync(await this.getDashboardStatusAsync());
  }

  private async getApiServerOverviewAsync(): Promise<HermesAgentOverview> {
    const [health] = await Promise.all([this.getDetailedHealthAsync(), this.getCapabilitiesAsync()]);

    const [sessions, jobs, toolsets, skills] = await Promise.all([
      this.getOptionalDataAsync("sessions", () => this.getSessionsAsync(), {
        items: [],
        total: null,
        hasMore: false,
      }),
      this.getOptionalDataAsync("jobs", () => this.getJobsAsync(), []),
      this.getOptionalDataAsync("toolsets", () => this.getToolsetsAsync(), []),
      this.getOptionalDataAsync("skills", () => this.getSkillsAsync(), []),
    ]);

    return {
      mode: "apiServer",
      health,
      sessions: sessions.data.items,
      sessionsTotal: sessions.data.total,
      sessionsHasMore: sessions.data.hasMore,
      jobs: jobs.data,
      toolsets: toolsets.data,
      dashboardStatus: null,
      skills: skills.data,
      update: null,
      dataAvailability: {
        sessions: sessions.available,
        jobs: jobs.available,
        toolsets: toolsets.available,
        skills: skills.available,
      },
    };
  }

  private async getDashboardOverviewAsync(dashboardStatus: HermesDashboardStatus): Promise<HermesAgentOverview> {
    const token = await this.getOptionalAsync(
      "dashboard session token",
      () => this.getDashboardSessionTokenAsync(),
      null,
    );
    const dashboardHeaders = token ? { "X-Hermes-Session-Token": token } : null;
    const authenticatedDashboardStatus = dashboardHeaders
      ? await this.getOptionalAsync(
          "authenticated dashboard status",
          () => this.getJsonAsync("/api/status", hermesDashboardStatusSchema, undefined, false, dashboardHeaders),
          dashboardStatus,
        )
      : dashboardStatus;
    const activityProfiles = getDashboardActivityProfiles(authenticatedDashboardStatus);
    const releaseDate = authenticatedDashboardStatus.release_date;
    const [activityStatus, skills, sessions, jobs, toolsets, update] = await Promise.all([
      this.getDashboardActivityStatusAsync(authenticatedDashboardStatus, activityProfiles, dashboardHeaders),
      dashboardHeaders
        ? this.getOptionalDataAsync(
            "dashboard skills",
            () => this.getJsonAsync("/api/skills", hermesSkillsResponseSchema, undefined, false, dashboardHeaders),
            [],
          )
        : this.getUnavailableData([]),
      dashboardHeaders
        ? this.getDashboardSessionsDataAsync(activityProfiles, dashboardHeaders)
        : this.getUnavailableData({ items: [], total: null, hasMore: false }),
      dashboardHeaders
        ? this.getOptionalDataAsync(
            "dashboard jobs",
            () => this.getJsonAsync("/api/cron/jobs", hermesJobsResponseSchema, undefined, false, dashboardHeaders),
            [],
          )
        : this.getUnavailableData([]),
      dashboardHeaders
        ? this.getOptionalDataAsync(
            "dashboard toolsets",
            () =>
              this.getJsonAsync(
                "/api/tools/toolsets",
                hermesToolsetsResponseSchema,
                undefined,
                false,
                dashboardHeaders,
              ),
            [],
          )
        : this.getUnavailableData([]),
      this.getDashboardUpdateStatusAsync(dashboardHeaders, releaseDate),
    ]);

    return {
      mode: "dashboard",
      health: {
        status: activityStatus.gateway_running === false ? "error" : "ok",
        platform: "hermes-dashboard",
        version: activityStatus.version,
        gateway_state: activityStatus.gateway_state,
        platforms: activityStatus.gateway_platforms,
        active_agents: activityStatus.active_agents ?? 0,
        active_sessions: activityStatus.active_sessions,
        gateway_busy: activityStatus.gateway_busy,
        gateway_drainable: activityStatus.gateway_drainable,
        exit_reason: activityStatus.gateway_exit_reason,
        updated_at: activityStatus.gateway_updated_at,
      },
      sessions: sessions.data.items,
      sessionsTotal: sessions.data.total,
      sessionsHasMore: sessions.data.hasMore,
      jobs: jobs.data,
      toolsets: toolsets.data,
      dashboardStatus: activityStatus,
      skills: skills.data,
      update,
      dataAvailability: {
        sessions: sessions.available,
        jobs: jobs.available,
        toolsets: toolsets.available,
        skills: skills.available,
      },
    };
  }

  public async getDetailedHealthAsync() {
    return await this.getJsonAsync("/health/detailed", hermesDetailedHealthSchema);
  }

  public async getCapabilitiesAsync() {
    return await this.getJsonAsync("/v1/capabilities", hermesCapabilitiesSchema);
  }

  public async getSessionsAsync() {
    return await this.getJsonAsync("/api/sessions", hermesSessionsResponseSchema, {
      limit: sessionFetchLimit,
      include_children: false,
      order: "recent",
    });
  }

  public async getJobsAsync() {
    return await this.getJsonAsync("/api/jobs", hermesJobsResponseSchema, {
      include_disabled: true,
    });
  }

  public async getToolsetsAsync() {
    return await this.getJsonAsync("/v1/toolsets", hermesToolsetsResponseSchema);
  }

  public async getSkillsAsync() {
    return await this.getJsonAsync("/v1/skills", hermesSkillsResponseSchema);
  }

  public async getDashboardStatusAsync() {
    return await this.getJsonAsync("/api/status", hermesDashboardStatusSchema, undefined, false);
  }

  private async getDashboardActivityStatusAsync(
    dashboardStatus: HermesDashboardStatus,
    profiles: string[],
    dashboardHeaders: Record<string, string> | null,
  ) {
    if (profiles.length === 0) return dashboardStatus;

    const statuses = await mapInBatchesAsync(profiles, dashboardProfileRequestConcurrency, (profile) =>
      this.getOptionalAsync(
        "dashboard profile status",
        () => this.getJsonAsync("/api/status", hermesDashboardStatusSchema, { profile }, false, dashboardHeaders ?? {}),
        null,
      ),
    );
    const availableStatuses = statuses.filter((status): status is HermesDashboardStatus => status !== null);

    return availableStatuses.length === 0
      ? dashboardStatus
      : aggregateDashboardActivity(dashboardStatus, availableStatuses);
  }

  private async getDashboardSessionsDataAsync(profiles: string[], dashboardHeaders: Record<string, string>) {
    const scopes: Array<string | null> = profiles.length === 0 ? [null] : profiles;
    const pages = await mapInBatchesAsync(scopes, dashboardProfileRequestConcurrency, (profile) =>
      this.getOptionalDataAsync(
        "dashboard profile sessions",
        () =>
          this.getJsonAsync(
            "/api/sessions",
            hermesSessionsResponseSchema,
            {
              limit: sessionFetchLimit,
              order: "recent",
              ...(profile ? { profile } : {}),
            },
            false,
            dashboardHeaders,
          ),
        { items: [], total: null, hasMore: true },
      ),
    );
    const allItems = pages
      .flatMap((page) => page.data.items)
      .toSorted((left, right) => getSessionActivityTime(right) - getSessionActivityTime(left));
    const items = allItems.slice(0, sessionFetchLimit);
    const allPagesAvailable = pages.every((page) => page.available);
    const allTotalsKnown = allPagesAvailable && pages.every((page) => page.data.total !== null);

    return {
      data: {
        items,
        total: allTotalsKnown ? pages.reduce((total, page) => total + (page.data.total ?? 0), 0) : null,
        hasMore: !allPagesAvailable || allItems.length > items.length || pages.some((page) => page.data.hasMore),
      } satisfies HermesSessionsPage,
      available: pages.some((page) => page.available),
    };
  }

  private async getDashboardUpdateStatusAsync(
    dashboardHeaders: Record<string, string> | null,
    releaseDate: string | null | undefined,
  ): Promise<HermesUpdateStatus | null> {
    const dashboardUpdate = dashboardHeaders
      ? await this.getOptionalAsync(
          "dashboard update status",
          () =>
            this.getJsonAsync(
              "/api/hermes/update/check",
              hermesDashboardUpdateSchema,
              undefined,
              false,
              dashboardHeaders,
            ),
          null,
        )
      : null;

    if (dashboardUpdate?.behind !== null && dashboardUpdate?.behind !== undefined) {
      return {
        currentReleaseTag: releaseDate ? `v${releaseDate}` : dashboardUpdate.current_version,
        latestReleaseTag: "upstream main",
        hasNewRelease: dashboardUpdate.behind > 0 || (dashboardUpdate.behind === 0 && dashboardUpdate.update_available),
        commitsBehind: dashboardUpdate.behind >= 0 ? dashboardUpdate.behind : null,
        releaseUrl: "https://github.com/NousResearch/hermes-agent/commits/main",
      };
    }

    return releaseDate
      ? await this.getOptionalAsync("GitHub release status", () => this.getUpdateStatusAsync(releaseDate), null)
      : null;
  }

  private async getUpdateStatusAsync(releaseDate: string): Promise<HermesUpdateStatus | null> {
    if (env.NO_EXTERNAL_CONNECTION) return null;

    const now = Date.now();
    for (const [key, entry] of githubUpdateCache) {
      if (entry.expiresAt <= now) githubUpdateCache.delete(key);
    }

    const cached = githubUpdateCache.get(releaseDate);
    if (cached && cached.expiresAt > now) {
      return await cached.promise;
    }

    while (githubUpdateCache.size >= githubUpdateCacheMaxEntries) {
      const oldestKey = githubUpdateCache.keys().next().value;
      if (oldestKey === undefined) break;
      githubUpdateCache.delete(oldestKey);
    }

    const promise = this.fetchUpdateStatusAsync(releaseDate).catch((error: unknown) => {
      if (githubUpdateCache.get(releaseDate)?.promise === promise) githubUpdateCache.delete(releaseDate);
      throw error;
    });
    githubUpdateCache.set(releaseDate, {
      expiresAt: now + githubUpdateCacheDurationMs,
      promise,
    });

    return await promise;
  }

  private async fetchUpdateStatusAsync(releaseDate: string): Promise<HermesUpdateStatus | null> {
    const currentReleaseTagResult = hermesReleaseTagSchema.safeParse(`v${releaseDate}`);
    if (!currentReleaseTagResult.success) return null;

    const currentReleaseTag = currentReleaseTagResult.data;
    const latestReleaseResponse = await fetchWithTrustedCertificatesAsync(
      new URL("https://api.github.com/repos/NousResearch/hermes-agent/releases/latest"),
      { headers: githubHeaders, timeout: requestTimeoutMs },
    );

    if (!latestReleaseResponse.ok) {
      return null;
    }

    const latestReleaseResult = hermesReleaseSchema.safeParse(await latestReleaseResponse.json());
    if (!latestReleaseResult.success) return null;

    const latestRelease = latestReleaseResult.data;
    if (latestRelease.tag_name === currentReleaseTag) {
      return {
        currentReleaseTag,
        latestReleaseTag: latestRelease.tag_name,
        hasNewRelease: false,
        commitsBehind: 0,
        releaseUrl: latestRelease.html_url ?? null,
      };
    }

    const compareResponse = await fetchWithTrustedCertificatesAsync(
      new URL(
        `https://api.github.com/repos/NousResearch/hermes-agent/compare/${encodeURIComponent(currentReleaseTag)}...${encodeURIComponent(latestRelease.tag_name)}`,
      ),
      { headers: githubHeaders, timeout: requestTimeoutMs },
    );
    if (!compareResponse.ok) return null;

    const compare = hermesCompareSchema.parse(await compareResponse.json());
    const hasNewRelease = compare.status === "ahead" || (compare.status === "diverged" && (compare.ahead_by ?? 0) > 0);

    return {
      currentReleaseTag,
      latestReleaseTag: latestRelease.tag_name,
      hasNewRelease,
      commitsBehind: hasNewRelease ? (compare.ahead_by ?? null) : 0,
      releaseUrl: latestRelease.html_url ?? null,
    };
  }

  private async getDashboardSessionTokenAsync() {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/"), {
      headers: { Accept: "text/html" },
      timeout: requestTimeoutMs,
    });

    if (!response.ok) return null;

    const html = await response.text();
    return html.match(/__HERMES_SESSION_TOKEN__="([^"]+)"/)?.[1] ?? null;
  }

  private async isApiServerAsync() {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/health"), {
      headers: { Accept: "application/json" },
      timeout: requestTimeoutMs,
    });
    if (!response.ok) return false;

    const data = await response.json().catch(() => null);
    return hermesApiHealthSchema.safeParse(data).success;
  }

  private async getJsonAsync<TSchema extends z.ZodType>(
    path: `/${string}`,
    schema: TSchema,
    queryParams?: Record<string, string | number | boolean>,
    includeAuth = true,
    headers: Record<string, string> = {},
  ): Promise<z.infer<TSchema>> {
    const response = await fetchWithTrustedCertificatesAsync(this.url(path, queryParams), {
      headers: {
        ...(includeAuth ? this.getAuthHeaders() : { Accept: "application/json" }),
        ...headers,
      },
      timeout: requestTimeoutMs,
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return schema.parse(await response.json()) as z.infer<TSchema>;
  }

  private async getOptionalAsync<T>(endpoint: string, requestAsync: () => Promise<T>, fallback: T) {
    try {
      return await requestAsync();
    } catch (error) {
      this.logUnexpectedOptionalError(endpoint, error);
      return fallback;
    }
  }

  private async getOptionalDataAsync<T>(endpoint: string, requestAsync: () => Promise<T>, fallback: T) {
    try {
      return { data: await requestAsync(), available: true };
    } catch (error) {
      this.logUnexpectedOptionalError(endpoint, error);
      return this.getUnavailableData(fallback);
    }
  }

  private logUnexpectedOptionalError(endpoint: string, error: unknown) {
    if (error instanceof ResponseError && [401, 403, 404, 405].includes(error.statusCode)) return;

    logger.warn(
      new ErrorWithMetadata(
        "Optional Hermes Agent endpoint failed",
        { endpoint, integrationId: this.integration.id },
        { cause: error },
      ),
    );
  }

  private getUnavailableData<T>(data: T) {
    return { data, available: false };
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      ...(this.hasSecretValue("apiKey") ? { Authorization: `Bearer ${this.getSecretValue("apiKey")}` } : {}),
      Accept: "application/json",
    };
  }
}

const getDashboardActivityProfiles = (status: HermesDashboardStatus) =>
  Array.from(new Set((status.gateways ?? []).map((gateway) => gateway.profile)));

const aggregateDashboardActivity = (
  dashboardStatus: HermesDashboardStatus,
  profileStatuses: HermesDashboardStatus[],
): HermesDashboardStatus => ({
  ...dashboardStatus,
  active_agents: sumReportedValues(profileStatuses.map((status) => status.active_agents)),
  active_sessions: sumReportedValues(profileStatuses.map((status) => status.active_sessions)),
  gateway_busy: profileStatuses.some((status) => status.gateway_busy === true),
});

const sumReportedValues = (values: Array<number | null | undefined>) =>
  values.some((value) => value !== null && value !== undefined)
    ? values.reduce<number>((total, value) => total + (value ?? 0), 0)
    : null;

const mapInBatchesAsync = async <TItem, TResult>(
  items: TItem[],
  batchSize: number,
  mapAsync: (item: TItem) => Promise<TResult>,
) => {
  const results: TResult[] = [];

  for (let batchStart = 0; batchStart < items.length; batchStart += batchSize) {
    results.push(...(await Promise.all(items.slice(batchStart, batchStart + batchSize).map(mapAsync))));
  }

  return results;
};

const getSessionActivityTime = (session: HermesSession) =>
  parseHermesTimestamp(session.last_active ?? session.started_at) ?? 0;
