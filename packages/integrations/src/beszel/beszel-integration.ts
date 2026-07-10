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
  BeszelContainerStatsRecord,
  BeszelSmartDevice,
  BeszelSystem,
  BeszelSystemDetails,
  BeszelSystemdService,
  BeszelSystemStatsRecord,
  CreateAlertInput,
  LiveStatsEvent,
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

  /**
   * Subscribe to real-time system and container stats via PocketBase SSE.
   * Connects to the PocketBase Realtime API and parses incoming SSE events,
   * filtering by systemId. This provides live-updating metrics (≤1s latency
   * from agent) instead of polling the REST API every 5s.
   */
  public async subscribeRealtimeMetrics(
    systemId: string,
    onMessage: (event: LiveStatsEvent) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const session = await this.authenticateAsync();
    const realtimeUrl = this.url("/api/realtime");

    logger.debug("Opening Beszel SSE connection for realtime metrics", {
      integrationId: this.integration.id,
      systemId,
      url: realtimeUrl.pathname,
    });

    const response = await fetchWithTrustedCertificatesAsync(realtimeUrl, {
      headers: { Authorization: session.token },
      signal,
    });

    if (!response.ok) {
      logger.warn("Beszel SSE connection failed", {
        integrationId: this.integration.id,
        systemId,
        status: response.status,
      });
      throw new ResponseError(response);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body in SSE stream");

    const decoder = new TextDecoder();
    let buffer = "";
    let subscribed = false;

    const processLine = async (line: string) => {
      if (!line.startsWith("data: ")) return;

      try {
        const parsed = JSON.parse(line.slice(6)) as Record<string, unknown>;

        // PB_CONNECT delivers the clientId — use it to POST our subscriptions
        if (!subscribed && typeof parsed.clientId === "string") {
          subscribed = true;
          const subscribeResponse = await fetchWithTrustedCertificatesAsync(realtimeUrl, {
            method: "POST",
            headers: {
              Authorization: session.token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              clientId: parsed.clientId,
              subscriptions: ["system_stats", "container_stats"],
            }),
            signal,
          });

          if (!subscribeResponse.ok) {
            logger.warn("Beszel SSE subscription POST failed", {
              integrationId: this.integration.id,
              systemId,
              status: subscribeResponse.status,
            });
            throw new ResponseError(subscribeResponse);
          }

          logger.debug("Beszel SSE subscribed to collections", {
            integrationId: this.integration.id,
            systemId,
            clientId: parsed.clientId,
          });
          return;
        }

        const record = parsed.record as Record<string, unknown> | undefined;
        if (!record || record.system !== systemId) return;

        if (Array.isArray(record.stats)) {
          onMessage({
            type: "container_stats",
            record: record as unknown as BeszelContainerStatsRecord,
          });
        } else if (record.stats && typeof record.stats === "object") {
          onMessage({
            type: "system_stats",
            record: record as unknown as BeszelSystemStatsRecord,
          });
        }
      } catch (error) {
        if (error instanceof ResponseError) throw error;
        // skip malformed SSE data lines
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          await processLine(line);
        }
      }
    } finally {
      reader.releaseLock();
      logger.debug("Beszel SSE connection closed", { integrationId: this.integration.id, systemId });
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
