import { ResponseError } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { SessionStore } from "../base/session-store";
import { createSessionStore } from "../base/session-store";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type {
  BeszelAlert,
  BeszelAlertHistory,
  BeszelAuthResponse,
  BeszelContainer,
  BeszelContainerStats,
  BeszelContainerStatsRecord,
  BeszelSmartDevice,
  BeszelSystem,
  BeszelSystemDetails,
  BeszelSystemdService,
  BeszelSystemStats,
  BeszelSystemStatsRecord,
  CreateAlertInput,
  PocketBaseListResponse,
  UpdateAlertInput,
} from "./beszel-types";

const logger = createLogger({ module: "beszel-integration" });

const escapeFilterValue = (value: string) => value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

interface BeszelSession {
  token: string;
  userId: string;
}

export class BeszelIntegration extends Integration {
  private readonly sessionStore: SessionStore<BeszelSession>;

  constructor(integration: IntegrationInput) {
    super(integration);
    this.sessionStore = createSessionStore(integration);
  }

  private async authenticateAsync(): Promise<BeszelSession> {
    const existingSession = await this.sessionStore.getAsync();
    if (existingSession) {
      logger.debug("Using stored Beszel session", { integrationId: this.integration.id });
      return existingSession;
    }

    const authUrl = this.url("/api/collections/users/auth-with-password");
    logger.debug("Authenticating with Beszel", { integrationId: this.integration.id, url: authUrl.pathname });
    const response = await fetchWithTrustedCertificatesAsync(authUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity: this.getSecretValue("username"),
        password: this.getSecretValue("password"),
      }),
    });
    logger.debug("Beszel auth response received", { integrationId: this.integration.id, status: response.status });

    if (!response.ok) {
      logger.warn("Beszel auth failed", { integrationId: this.integration.id, status: response.status });
      throw new ResponseError(response);
    }

    const data = (await response.json()) as BeszelAuthResponse;
    const session: BeszelSession = { token: data.token, userId: data.record.id };
    await this.sessionStore.setAsync(session);
    logger.debug("Saved Beszel session", { integrationId: this.integration.id, userId: session.userId });
    return session;
  }

  private async fetchWithAuthAsync(url: URL, options: { method?: string; body?: string } = {}) {
    const method = options.method ?? "GET";
    const start = performance.now();
    let session = await this.authenticateAsync();

    const doFetch = (token: string) =>
      fetchWithTrustedCertificatesAsync(url, {
        method,
        headers: {
          Authorization: token,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
        },
        body: options.body,
      });

    let response = await doFetch(session.token);
    logger.debug("Beszel response", {
      integrationId: this.integration.id,
      method,
      path: url.pathname,
      status: response.status,
      durationMs: Math.round(performance.now() - start),
      attempt: 1,
    });

    if (response.status === 401) {
      logger.warn("Beszel 401, clearing session and retrying", {
        integrationId: this.integration.id,
        method,
        path: url.pathname,
      });
      await this.sessionStore.clearAsync();
      session = await this.authenticateAsync();
      response = await doFetch(session.token);
      logger.debug("Beszel response (after re-auth)", {
        integrationId: this.integration.id,
        method,
        path: url.pathname,
        status: response.status,
        durationMs: Math.round(performance.now() - start),
        attempt: 2,
      });
    }

    if (!response.ok) {
      logger.warn("Beszel request failed", {
        integrationId: this.integration.id,
        method,
        path: url.pathname,
        status: response.status,
        durationMs: Math.round(performance.now() - start),
      });
      throw new ResponseError(response);
    }

    return response;
  }

  public async getSystemsAsync(): Promise<BeszelSystem[]> {
    const response = await this.fetchWithAuthAsync(
      this.url("/api/collections/systems/records", { perPage: "500", sort: "-updated" }),
    );
    const data = (await response.json()) as PocketBaseListResponse<BeszelSystem>;
    return data.items;
  }

  public async getSystemDetailsAsync(systemId: string): Promise<BeszelSystemDetails> {
    const response = await this.fetchWithAuthAsync(
      this.url(`/api/collections/system_details/records/${systemId}` as `/${string}`),
    );
    return (await response.json()) as BeszelSystemDetails;
  }

  public async getSystemStatsAsync(systemId: string, type = "1m", perPage = 60): Promise<BeszelSystemStatsRecord[]> {
    const filter = `system='${escapeFilterValue(systemId)}' && type='${escapeFilterValue(type)}'`;
    const response = await this.fetchWithAuthAsync(
      this.url("/api/collections/system_stats/records", {
        filter,
        sort: "-created",
        perPage: String(perPage),
      }),
    );
    const data = (await response.json()) as PocketBaseListResponse<BeszelSystemStatsRecord>;
    return data.items;
  }

  public async getContainersAsync(systemId: string): Promise<BeszelContainer[]> {
    const response = await this.fetchWithAuthAsync(
      this.url("/api/collections/containers/records", {
        filter: `system='${escapeFilterValue(systemId)}'`,
        sort: "-updated",
        perPage: "500",
      }),
    );
    const data = (await response.json()) as PocketBaseListResponse<BeszelContainer>;
    return data.items;
  }

  public async getContainerStatsAsync(
    systemId: string,
    type = "1m",
    perPage = 60,
  ): Promise<BeszelContainerStatsRecord[]> {
    const filter = `system='${escapeFilterValue(systemId)}' && type='${escapeFilterValue(type)}'`;
    const response = await this.fetchWithAuthAsync(
      this.url("/api/collections/container_stats/records", {
        filter,
        sort: "-created",
        perPage: String(perPage),
      }),
    );
    const data = (await response.json()) as PocketBaseListResponse<BeszelContainerStatsRecord>;
    return data.items;
  }

  public async getSmartDevicesAsync(systemId: string): Promise<BeszelSmartDevice[]> {
    const response = await this.fetchWithAuthAsync(
      this.url("/api/collections/smart_devices/records", {
        filter: `system='${escapeFilterValue(systemId)}'`,
      }),
    );
    const data = (await response.json()) as PocketBaseListResponse<BeszelSmartDevice>;
    return data.items;
  }

  public async getSystemdServicesAsync(systemId: string): Promise<BeszelSystemdService[]> {
    const response = await this.fetchWithAuthAsync(
      this.url("/api/collections/systemd_services/records", {
        filter: `system='${escapeFilterValue(systemId)}'`,
        sort: "name",
      }),
    );
    const data = (await response.json()) as PocketBaseListResponse<BeszelSystemdService>;
    return data.items;
  }

  public async getAlertsAsync(systemId?: string): Promise<BeszelAlert[]> {
    const params: Record<string, string> = { perPage: "500" };
    if (systemId) {
      params.filter = `system='${escapeFilterValue(systemId)}'`;
    }
    const response = await this.fetchWithAuthAsync(this.url("/api/collections/alerts/records", params));
    const data = (await response.json()) as PocketBaseListResponse<BeszelAlert>;
    return data.items;
  }

  public async getAlertHistoryAsync(systemId?: string, perPage = 50): Promise<BeszelAlertHistory[]> {
    const params: Record<string, string> = {
      sort: "-created",
      perPage: String(perPage),
    };
    if (systemId) {
      params.filter = `system='${escapeFilterValue(systemId)}'`;
    }
    const response = await this.fetchWithAuthAsync(this.url("/api/collections/alerts_history/records", params));
    const data = (await response.json()) as PocketBaseListResponse<BeszelAlertHistory>;
    return data.items;
  }

  public async createAlertAsync(systemId: string, input: CreateAlertInput): Promise<BeszelAlert> {
    const session = await this.authenticateAsync();
    const response = await this.fetchWithAuthAsync(this.url("/api/collections/alerts/records"), {
      method: "POST",
      body: JSON.stringify({
        system: systemId,
        user: session.userId,
        name: input.name,
        value: input.value,
        min: input.min ?? 0,
        triggered: false,
      }),
    });
    return (await response.json()) as BeszelAlert;
  }

  public async updateAlertAsync(alertId: string, input: UpdateAlertInput): Promise<BeszelAlert> {
    const response = await this.fetchWithAuthAsync(
      this.url(`/api/collections/alerts/records/${alertId}` as `/${string}`),
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
    return (await response.json()) as BeszelAlert;
  }

  public async deleteAlertAsync(alertId: string): Promise<void> {
    await this.fetchWithAuthAsync(this.url(`/api/collections/alerts/records/${alertId}` as `/${string}`), {
      method: "DELETE",
    });
  }

  public async pauseSystemAsync(systemId: string): Promise<void> {
    await this.fetchWithAuthAsync(this.url(`/api/collections/systems/records/${systemId}` as `/${string}`), {
      method: "PATCH",
      body: JSON.stringify({ status: "paused" }),
    });
  }

  public async resumeSystemAsync(systemId: string): Promise<void> {
    await this.fetchWithAuthAsync(this.url(`/api/collections/systems/records/${systemId}` as `/${string}`), {
      method: "PATCH",
      body: JSON.stringify({ status: "pending" }),
    });
  }

  public async deleteSystemAsync(systemId: string): Promise<void> {
    await this.fetchWithAuthAsync(this.url(`/api/collections/systems/records/${systemId}` as `/${string}`), {
      method: "DELETE",
    });
  }

  public async subscribeRealtimeMetrics(
    systemId: string,
    onMessage: (data: { stats: BeszelSystemStatsRecord; containerStats: BeszelContainerStatsRecord | null }) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const session = await this.authenticateAsync();
    const sseUrl = this.url("/api/realtime");
    logger.debug("Opening Beszel SSE connection", { integrationId: this.integration.id, systemId });

    const sseResponse = await fetchWithTrustedCertificatesAsync(sseUrl, {
      headers: { Authorization: session.token },
      signal,
    });

    if (!sseResponse.ok || !sseResponse.body) {
      logger.warn("Beszel SSE connection failed", {
        integrationId: this.integration.id,
        systemId,
        status: sseResponse.status,
      });
      throw new ResponseError(sseResponse);
    }
    logger.debug("Beszel SSE connection opened", { integrationId: this.integration.id, systemId });

    const reader = sseResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let clientId: string | null = null;

    const processLine = (line: string) => {
      if (!line.startsWith("data:")) return;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr) return;

      try {
        const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

        if (!clientId && typeof parsed.clientId === "string") {
          clientId = parsed.clientId;
          this.subscribeTopic(clientId, systemId, session.token).catch((err) => {
            logger.warn("Failed to subscribe to rt_metrics topic, aborting SSE", { error: err });
            reader.cancel().catch(() => {});
          });
          return;
        }

        if ("stats" in parsed) {
          const now = new Date().toISOString();
          const envelope = { id: "", system: systemId, type: "1m" as const, created: now, updated: now };
          const stats: BeszelSystemStatsRecord = { ...envelope, stats: parsed.stats as BeszelSystemStats };

          let containerStats: BeszelContainerStatsRecord | null = null;
          const hasContainers =
            parsed.container &&
            Array.isArray(parsed.container) &&
            (parsed.container as BeszelContainerStats[]).length > 0;
          if (hasContainers) {
            containerStats = { ...envelope, stats: parsed.container as BeszelContainerStats[] };
          }
          onMessage({ stats, containerStats });
        }
      } catch {
        logger.debug("Failed to parse SSE message", { line });
      }
    };

    try {
      while (!signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          processLine(line);
        }
      }
      if (!signal.aborted) {
        logger.warn("Beszel SSE stream ended unexpectedly", {
          integrationId: this.integration.id,
          systemId,
        });
        throw new Error("Beszel SSE stream ended unexpectedly");
      }
    } finally {
      reader.cancel().catch(() => {});
    }
  }

  private async subscribeTopic(clientId: string, systemId: string, token: string): Promise<void> {
    const topic = `rt_metrics?options=${JSON.stringify({ query: { system: systemId } })}`;
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/realtime"), {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clientId, subscriptions: [topic] }),
    });
    if (!response.ok) {
      throw new ResponseError(response);
    }
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/collections/users/auth-with-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity: this.getSecretValue("username"),
        password: this.getSecretValue("password"),
      }),
    });

    if (!response.ok) {
      return TestConnectionError.StatusResult({ status: response.status, url: response.url });
    }

    const data = (await response.json()) as BeszelAuthResponse;
    if (!data.token) {
      return TestConnectionError.UnauthorizedResult(401);
    }

    return { success: true };
  }
}
