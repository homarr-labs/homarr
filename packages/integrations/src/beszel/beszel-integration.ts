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
  BeszelSystemStats,
  BeszelContainerStats,
  CreateAlertInput,
  LiveStatsEvent,
  PocketBaseListResponse,
  UpdateAlertInput,
} from "./beszel-types";
import { createRealtimeMetricsTopic, PocketBaseSseParser } from "./pocketbase-realtime";

const logger = createLogger({ module: "beszel-integration" });

const escapeFilterValue = (value: string) => value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
const realtimeRetryDelaysMs = [200, 300, 500, 1_000, 1_500, 2_000] as const;

const supportsRealtimeMetrics = (version: string) => {
  const [major = 0, minor = 0] = version.replace(/^v/, "").split(".").map(Number);
  return major > 0 || minor >= 13;
};

const waitForRetryAsync = async (delayMs: number, signal: AbortSignal) =>
  await new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const timeout = setTimeout(done, delayMs);
    signal.addEventListener("abort", done, { once: true });
    function done() {
      clearTimeout(timeout);
      signal.removeEventListener("abort", done);
      resolve();
    }
  });

interface BeszelRealtimeSnapshot {
  stats?: BeszelSystemStats;
  container?: BeszelContainerStats[];
}

export const normalizeRealtimeSnapshot = (
  payload: BeszelRealtimeSnapshot,
  systemId: string,
  receivedAt = new Date(),
): LiveStatsEvent[] => {
  const created = receivedAt.toISOString();
  const id = `realtime-${receivedAt.getTime()}`;
  const events: LiveStatsEvent[] = [];

  if (payload.stats && typeof payload.stats === "object" && !Array.isArray(payload.stats)) {
    events.push({
      type: "system_stats",
      record: { id, system: systemId, stats: payload.stats, type: "1m", created, updated: created },
    });
  }
  if (Array.isArray(payload.container)) {
    events.push({
      type: "container_stats",
      record: { id, system: systemId, stats: payload.container, type: "1m", created, updated: created },
    });
  }

  return events;
};

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

  /** Subscribe to Beszel's custom one-second `rt_metrics` PocketBase topic. */
  public async subscribeRealtimeMetrics(
    systemId: string,
    onMessage: (event: LiveStatsEvent) => void,
    signal: AbortSignal,
  ): Promise<void> {
    const systems = await this.getSystemsAsync();
    const system = systems.find((candidate) => candidate.id === systemId);
    if (!system) throw new Error("Selected Beszel system was not found");
    if (system.status !== "up")
      throw new Error(`Beszel system is ${system.status}; Live mode requires an online system`);
    if (!supportsRealtimeMetrics(system.info.v)) {
      throw new Error(`Beszel agent ${system.info.v} does not support Live mode; version 0.13.0 or newer is required`);
    }

    const realtimeUrl = this.url("/api/realtime");
    const topic = createRealtimeMetricsTopic(systemId);
    let retryAttempt = 0;
    let emittedSnapshotCount = 0;

    while (!signal.aborted) {
      try {
        let session = await this.authenticateAsync();
        const openStream = async () =>
          await fetchWithTrustedCertificatesAsync(realtimeUrl, {
            headers: {
              Accept: "text/event-stream",
              Authorization: session.token,
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
            signal,
            bodyTimeout: 0,
          });

        logger.debug("Opening Beszel rt_metrics SSE connection", {
          integrationId: this.integration.id,
          systemId,
          retryAttempt,
        });
        let response = await openStream();
        if (response.status === 401) {
          await this.sessionStore.clearAsync();
          session = await this.authenticateAsync();
          response = await openStream();
        }
        if (!response.ok) throw new ResponseError(response);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Beszel realtime response has no body");
        const decoder = new TextDecoder();
        const parser = new PocketBaseSseParser();
        let clientId: string | undefined;

        const processFrameAsync = async (frame: ReturnType<PocketBaseSseParser["push"]>[number]) => {
          if (frame.event === "PB_CONNECT") {
            let fallbackClientId: string | undefined;
            try {
              const connectData = JSON.parse(frame.data) as { clientId?: string };
              fallbackClientId = connectData.clientId;
            } catch {
              // PocketBase normally provides the client ID in the SSE id field.
            }
            clientId = frame.id || fallbackClientId;
            if (!clientId) throw new Error("PocketBase PB_CONNECT event did not include a client ID");

            const subscribeResponse = await fetchWithTrustedCertificatesAsync(realtimeUrl, {
              method: "POST",
              headers: { Authorization: session.token, "Content-Type": "application/json" },
              body: JSON.stringify({ clientId, subscriptions: [topic] }),
              signal,
            });
            if (subscribeResponse.status === 401) await this.sessionStore.clearAsync();
            if (!subscribeResponse.ok) throw new ResponseError(subscribeResponse);
            logger.debug("Subscribed to Beszel rt_metrics topic", {
              integrationId: this.integration.id,
              systemId,
              clientId,
            });
            return;
          }

          if (!frame.event.startsWith("rt_metrics")) return;
          try {
            const snapshot = JSON.parse(frame.data) as BeszelRealtimeSnapshot;
            const events = normalizeRealtimeSnapshot(snapshot, systemId);
            if (events.length === 0) return;
            emittedSnapshotCount += 1;
            retryAttempt = 0;
            for (const event of events) onMessage(event);
            if (emittedSnapshotCount === 1 || emittedSnapshotCount % 30 === 0) {
              logger.debug("Forwarded Beszel rt_metrics snapshots", {
                integrationId: this.integration.id,
                systemId,
                emittedSnapshotCount,
                containerCount: snapshot.container?.length ?? 0,
              });
            }
          } catch (error) {
            logger.warn("Failed to parse Beszel rt_metrics payload", {
              integrationId: this.integration.id,
              systemId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        };

        logger.debug("Beszel rt_metrics SSE connection established", {
          integrationId: this.integration.id,
          systemId,
          contentType: response.headers.get("content-type"),
        });
        try {
          while (!signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            for (const frame of parser.push(decoder.decode(value, { stream: true }))) {
              await processFrameAsync(frame);
            }
          }
          for (const frame of parser.push(decoder.decode())) await processFrameAsync(frame);
          for (const frame of parser.finish()) await processFrameAsync(frame);
        } finally {
          await reader.cancel().catch(() => {});
          reader.releaseLock();
        }

        if (!signal.aborted) throw new Error("Beszel rt_metrics SSE stream ended unexpectedly");
      } catch (error) {
        if (signal.aborted) break;
        if (error instanceof ResponseError && error.statusCode === 401 && retryAttempt === 0) {
          retryAttempt += 1;
          logger.debug("Retrying Beszel rt_metrics handshake after reauthentication", {
            integrationId: this.integration.id,
            systemId,
          });
          continue;
        }
        if (error instanceof ResponseError && error.statusCode < 500 && error.statusCode !== 429) throw error;
        const delayMs = realtimeRetryDelaysMs[Math.min(retryAttempt, realtimeRetryDelaysMs.length - 1)] ?? 2_000;
        retryAttempt += 1;
        logger.warn("Beszel rt_metrics connection lost; retrying", {
          integrationId: this.integration.id,
          systemId,
          retryAttempt,
          delayMs,
          error: error instanceof Error ? error.message : String(error),
        });
        await waitForRetryAsync(delayMs, signal);
      }
    }

    logger.debug("Beszel rt_metrics subscription stopped", {
      integrationId: this.integration.id,
      systemId,
      emittedSnapshotCount,
    });
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
