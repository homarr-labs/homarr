import { ParseError, ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { Notification } from "../interfaces/notifications/notification-types";
import type { INotificationsIntegration } from "../interfaces/notifications/notifications-integration";
import type { DockhandStats } from "./dockhand-types";
import {
  dockhandActivityResponseSchema,
  dockhandDashboardStatsResponseSchema,
  dockhandEnvironmentsResponseSchema,
  mapDockhandStats,
  parseDockhandResponseAsync,
  parseDockhandTimestamp,
} from "./dockhand-types";

// Dockhand waits up to 5s per environment for Docker and 10s per list call, in parallel.
const STATS_REQUEST_TIMEOUT_MS = 20_000;
const REQUEST_TIMEOUT_MS = 10_000;
const ACTIVITY_LIMIT = 50;

export class DockhandIntegration extends Integration implements INotificationsIntegration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    // Environments require a valid token when Dockhand authentication is enabled.
    const response = await input.fetchAsync(this.url("/api/environments"), {
      headers: await this.getHeadersAsync(),
    });

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    try {
      await parseDockhandResponseAsync(response, dockhandEnvironmentsResponseSchema, "Invalid Dockhand response");
    } catch (error) {
      return TestConnectionError.ParseResult(
        error instanceof ParseError ? error : new ParseError("Invalid Dockhand response", { cause: error as Error }),
      );
    }

    return { success: true };
  }

  public async getStatsAsync(): Promise<DockhandStats> {
    const environments = await this.getJsonAsync(
      this.url("/api/dashboard/stats"),
      dockhandDashboardStatsResponseSchema,
      STATS_REQUEST_TIMEOUT_MS,
    );
    return mapDockhandStats(environments);
  }

  public async getNotificationsAsync(): Promise<Notification[]> {
    const [{ events }, environments] = await Promise.all([
      this.getJsonAsync(
        this.url("/api/activity", { limit: ACTIVITY_LIMIT }),
        dockhandActivityResponseSchema,
        REQUEST_TIMEOUT_MS,
      ),
      this.getJsonAsync(this.url("/api/environments"), dockhandEnvironmentsResponseSchema, REQUEST_TIMEOUT_MS),
    ]);
    const environmentNames = new Map(environments.map((environment) => [environment.id, environment.name]));
    const href = this.externalUrl("/activity").toString();

    return events.map((event): Notification => {
      const environmentName =
        event.environmentId === null || event.environmentId === undefined
          ? undefined
          : environmentNames.get(event.environmentId);

      return {
        id: String(event.id),
        time: parseDockhandTimestamp(event.timestamp),
        title: `${event.containerName ?? event.image ?? "—"}: ${event.action}`,
        body: [event.image, environmentName].filter(Boolean).join(" · "),
        href,
      };
    });
  }

  private async getJsonAsync<TSchema extends Parameters<typeof parseDockhandResponseAsync>[1]>(
    url: URL,
    schema: TSchema,
    timeout: number,
  ) {
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: await this.getHeadersAsync(),
      timeout,
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return await parseDockhandResponseAsync(response, schema, "Invalid Dockhand response");
  }

  private async getHeadersAsync(): Promise<Record<string, string>> {
    const { headers } = await this.getHttpAuthenticationAsync();
    return headers;
  }
}
