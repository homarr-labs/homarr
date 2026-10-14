import { Buffer } from "node:buffer";
import { z } from "zod";

import { isRecord } from "@homarr/common/object";
import { ResponseError } from "@homarr/common/response-error";

import type { IntegrationInput } from "../../base/integration";
import { createSessionStore } from "../../base/session-store";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { CreateAlertInput, UpdateAlertInput, LiveStatsEvent } from "../../beszel/beszel-types";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import type { IntegrationRuntimeResources } from "../../runtime/contracts";
import {
  beszelAuthSchema,
  beszelSystemSchema,
  beszelDetailsSchema,
  beszelStatsRecordSchema,
  beszelContainerSchema,
  beszelContainerStatsRecordSchema,
  beszelSmartSchema,
  beszelServiceSchema,
  beszelAlertSchema,
  beszelAlertHistorySchema,
} from "./beszel-schemas";
import { SystemsHttpClient, SystemsResourceHold } from "./http";
import type { SystemsHttpOperation } from "./http";
import { pickBeszelStats } from "./stats";

export interface BeszelHttpSession {
  token: string;
  userId: string;
  expiresAt?: number;
}
const escapeFilterValue = (value: string) => value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

export function parseBeszelTokenExpiration(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    );
    return isRecord(decoded) && typeof decoded.exp === "number" && Number.isFinite(decoded.exp)
      ? decoded.exp * 1000
      : null;
  } catch {
    return null;
  }
}

export const isBeszelSessionExpired = (session: BeszelHttpSession, now = Date.now()) =>
  session.expiresAt !== undefined && session.expiresAt - 60_000 <= now;

export class BeszelHttpClient extends SystemsHttpClient {
  private readonly sessionStore;
  private pendingAuthentication: Promise<BeszelHttpSession> | undefined;

  constructor(input: IntegrationInput, resources: IntegrationRuntimeResources) {
    super(input, resources);
    this.sessionStore = createSessionStore<BeszelHttpSession>(input, resources.sessions);
  }

  async getStatsAsync() {
    return pickBeszelStats(await this.getSystemsAsync());
  }

  override async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    return await this.runAsync(async (http) => {
      const session = await this.authenticateAsync(http);
      return { headers: { Authorization: session.token }, redactValues: [session.token] };
    });
  }

  async getSystemsAsync() {
    return await this.runAsync((http) =>
      this.listAsync(http, "/api/collections/systems/records", beszelSystemSchema, {
        perPage: "500",
        sort: "-updated",
      }),
    );
  }

  async getSystemDetailsAsync(systemId: string) {
    return await this.runAsync(async (http) =>
      beszelDetailsSchema.parse(
        await this.fetchWithAuthAsync(http, this.url(`/api/collections/system_details/records/${systemId}`)),
      ),
    );
  }

  async getSystemStatsAsync(systemId: string, type = "1m", perPage = 60) {
    return await this.runAsync((http) =>
      this.listAsync(http, "/api/collections/system_stats/records", beszelStatsRecordSchema, {
        filter: `system='${escapeFilterValue(systemId)}' && type='${escapeFilterValue(type)}'`,
        sort: "-created",
        perPage: String(perPage),
      }),
    );
  }

  async getContainersAsync(systemId: string) {
    return await this.runAsync((http) =>
      this.listAsync(http, "/api/collections/containers/records", beszelContainerSchema, {
        filter: `system='${escapeFilterValue(systemId)}'`,
        sort: "-updated",
        perPage: "500",
      }),
    );
  }

  async getContainerStatsAsync(systemId: string, type = "1m", perPage = 60) {
    return await this.runAsync((http) =>
      this.listAsync(http, "/api/collections/container_stats/records", beszelContainerStatsRecordSchema, {
        filter: `system='${escapeFilterValue(systemId)}' && type='${escapeFilterValue(type)}'`,
        sort: "-created",
        perPage: String(perPage),
      }),
    );
  }

  async getSmartDevicesAsync(systemId: string) {
    return await this.runAsync((http) =>
      this.listAsync(http, "/api/collections/smart_devices/records", beszelSmartSchema, {
        filter: `system='${escapeFilterValue(systemId)}'`,
      }),
    );
  }

  async getSystemdServicesAsync(systemId: string) {
    return await this.runAsync((http) =>
      this.listAsync(http, "/api/collections/systemd_services/records", beszelServiceSchema, {
        filter: `system='${escapeFilterValue(systemId)}'`,
        sort: "name",
      }),
    );
  }

  async getAlertsAsync(systemId?: string) {
    const params: Record<string, string> = { perPage: "500" };
    if (systemId) params.filter = `system='${escapeFilterValue(systemId)}'`;
    return await this.runAsync((http) =>
      this.listAsync(http, "/api/collections/alerts/records", beszelAlertSchema, params),
    );
  }

  async getAlertHistoryAsync(systemId?: string, perPage = 50) {
    const params: Record<string, string> = { sort: "-created", perPage: String(perPage) };
    if (systemId) params.filter = `system='${escapeFilterValue(systemId)}'`;
    return await this.runAsync((http) =>
      this.listAsync(http, "/api/collections/alerts_history/records", beszelAlertHistorySchema, params),
    );
  }

  async createAlertAsync(systemId: string, input: CreateAlertInput) {
    this.requireInteraction();
    return await this.runAsync(async (http) => {
      const session = await this.authenticateAsync(http);
      return beszelAlertSchema.parse(
        await this.fetchWithAuthAsync(http, this.url("/api/collections/alerts/records"), {
          method: "POST",
          body: JSON.stringify({
            system: systemId,
            user: session.userId,
            name: input.name,
            value: input.value,
            min: input.min ?? 0,
            triggered: false,
          }),
        }),
      );
    });
  }

  async updateAlertAsync(alertId: string, input: UpdateAlertInput) {
    this.requireInteraction();
    return await this.runAsync(async (http) =>
      beszelAlertSchema.parse(
        await this.fetchWithAuthAsync(http, this.url(`/api/collections/alerts/records/${alertId}`), {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      ),
    );
  }

  async deleteAlertAsync(alertId: string): Promise<void> {
    this.requireInteraction();
    await this.runAsync((http) =>
      this.fetchWithAuthAsync(http, this.url(`/api/collections/alerts/records/${alertId}`), {
        method: "DELETE",
        discard: true,
      }),
    );
  }

  async pauseSystemAsync(systemId: string): Promise<void> {
    this.requireInteraction();
    await this.runAsync((http) =>
      this.fetchWithAuthAsync(http, this.url(`/api/collections/systems/records/${systemId}`), {
        method: "PATCH",
        body: JSON.stringify({ status: "paused" }),
        discard: true,
      }),
    );
  }

  async resumeSystemAsync(systemId: string): Promise<void> {
    this.requireInteraction();
    await this.runAsync((http) =>
      this.fetchWithAuthAsync(http, this.url(`/api/collections/systems/records/${systemId}`), {
        method: "PATCH",
        body: JSON.stringify({ status: "pending" }),
        discard: true,
      }),
    );
  }

  async deleteSystemAsync(systemId: string): Promise<void> {
    this.requireInteraction();
    await this.runAsync((http) =>
      this.fetchWithAuthAsync(http, this.url(`/api/collections/systems/records/${systemId}`), {
        method: "DELETE",
        discard: true,
      }),
    );
  }

  async subscribeRealtimeMetrics(
    _systemId: string,
    _onMessage: (event: LiveStatsEvent) => void,
    _signal: AbortSignal,
  ): Promise<void> {
    throw new SystemsResourceHold("beszel-sse");
  }

  protected async testingAsync(http: SystemsHttpOperation) {
    return await http.readAsync(
      this.url("/api/collections/users/auth-with-password"),
      async (response) => {
        if (!response.ok) return TestConnectionError.StatusResult(response);
        const data: unknown = await response.json();
        if (!isRecord(data) || typeof data.token !== "string" || !data.token)
          return TestConnectionError.UnauthorizedResult(401);
        return { success: true } as const;
      },
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: this.secret("username"), password: this.secret("password") }),
      },
    );
  }

  private requireInteraction(): void {
    throw new SystemsResourceHold("interaction-authority");
  }

  private async listAsync<T>(
    http: SystemsHttpOperation,
    path: `/${string}`,
    schema: z.ZodType<T>,
    params: Record<string, string>,
  ) {
    const data = await this.fetchWithAuthAsync(http, this.url(path, params));
    return z.object({ items: z.array(schema) }).parse(data).items;
  }

  private async authenticateAsync(http: SystemsHttpOperation) {
    if (this.pendingAuthentication) return await this.pendingAuthentication;
    const pending = this.loadSessionAsync(http);
    this.pendingAuthentication = pending;
    try {
      return await pending;
    } finally {
      if (this.pendingAuthentication === pending) this.pendingAuthentication = undefined;
    }
  }

  private async loadSessionAsync(http: SystemsHttpOperation): Promise<BeszelHttpSession> {
    const existing = await this.sessionStore.getAsync();
    http.assertActive();
    if (existing && !isBeszelSessionExpired(existing)) {
      this.resources.log?.write("debug", "Using stored Beszel session", { integrationId: this.integration.id });
      return existing;
    }
    if (existing) {
      this.resources.log?.write("debug", "Stored Beszel session expired, re-authenticating", {
        integrationId: this.integration.id,
        expiresAt: existing.expiresAt,
      });
      await this.sessionStore.clearAsync();
    }
    this.resources.log?.write("debug", "Authenticating with Beszel", { integrationId: this.integration.id });
    const data = beszelAuthSchema.parse(
      await http.jsonAsync(this.url("/api/collections/users/auth-with-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: this.secret("username"), password: this.secret("password") }),
      }),
    );
    const expiresAt = parseBeszelTokenExpiration(data.token) ?? undefined;
    if (expiresAt !== undefined && expiresAt <= Date.now()) {
      this.resources.log?.write("warn", "Beszel issued an already-expired token", {
        integrationId: this.integration.id,
        expiresAt,
      });
      throw new Error("Beszel issued an already-expired authentication token, check for clock skew");
    }
    const session = { token: data.token, userId: data.record.id, expiresAt };
    const ttlSeconds = expiresAt === undefined ? undefined : Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));
    http.assertActive();
    await this.sessionStore.setAsync(session, ttlSeconds === undefined ? undefined : { ttlSeconds });
    this.resources.log?.write("debug", "Saved Beszel session", { integrationId: this.integration.id, expiresAt });
    return session;
  }

  private async fetchWithAuthAsync(
    http: SystemsHttpOperation,
    url: URL,
    options: { method?: string; body?: string; discard?: boolean } = {},
  ): Promise<unknown> {
    const method = options.method ?? "GET";
    const start = performance.now();
    const request = async (token: string) =>
      http.readAsync(
        url,
        async (response) => {
          this.resources.log?.write("debug", "Beszel response", {
            integrationId: this.integration.id,
            method,
            path: url.pathname,
            status: response.status,
            durationMs: Math.round(performance.now() - start),
          });
          if (response.status === 401) return { status: 401, data: undefined };
          if (!response.ok) {
            this.resources.log?.write("warn", "Beszel request failed", {
              integrationId: this.integration.id,
              method,
              status: response.status,
            });
            throw new ResponseError({ status: response.status });
          }
          const data: unknown = options.discard ? undefined : await response.json();
          return { status: response.status, data };
        },
        {
          method,
          headers: { Authorization: token, ...(options.body ? { "Content-Type": "application/json" } : {}) },
          body: options.body,
        },
      );
    let session = await this.authenticateAsync(http);
    let result = await request(session.token);
    if (result.status === 401 && method === "GET") {
      this.resources.log?.write("warn", "Beszel 401, clearing session and retrying", {
        integrationId: this.integration.id,
        method,
        path: url.pathname,
      });
      http.assertActive();
      await this.sessionStore.clearAsync();
      session = await this.authenticateAsync(http);
      result = await request(session.token);
    }
    if (result.status === 401) throw new ResponseError({ status: 401 });
    return result.data;
  }
}
