import { ParseError, ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import {
  uptimeKumaHeartbeatCategoryMap,
  uptimeKumaHeartbeatResponseSchema,
  uptimeKumaStatusPageResponseSchema,
} from "./uptime-kuma-types";
import type { UptimeKumaDashboardData, UptimeKumaMonitor, UptimeKumaMonitorCategory } from "./uptime-kuma-types";

export class UptimeKumaIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const statusPageResponse = await input.fetchAsync(this.statusPageUrl());

    if (!statusPageResponse.ok) {
      return TestConnectionError.StatusResult(statusPageResponse);
    }

    const statusPageParsed = uptimeKumaStatusPageResponseSchema.safeParse(await statusPageResponse.json());

    if (!statusPageParsed.success) {
      return TestConnectionError.ParseResult(
        new ParseError("Invalid Uptime Kuma status page response", { cause: statusPageParsed.error }),
      );
    }

    const heartbeatResponse = await input.fetchAsync(this.heartbeatUrl());

    if (!heartbeatResponse.ok) {
      return TestConnectionError.StatusResult(heartbeatResponse);
    }

    const heartbeatParsed = uptimeKumaHeartbeatResponseSchema.safeParse(await heartbeatResponse.json());

    if (!heartbeatParsed.success) {
      return TestConnectionError.ParseResult(
        new ParseError("Invalid Uptime Kuma heartbeat response", { cause: heartbeatParsed.error }),
      );
    }

    return { success: true };
  }

  public async getDashboardDataAsync(): Promise<UptimeKumaDashboardData> {
    const [statusPageResponse, heartbeatResponse] = await Promise.all([
      this.getStatusPageAsync(),
      this.getHeartbeatAsync(),
    ]);

    const statusPage = uptimeKumaStatusPageResponseSchema.parse(await statusPageResponse.json());
    const heartbeat = uptimeKumaHeartbeatResponseSchema.parse(await heartbeatResponse.json());

    const monitors = statusPage.publicGroupList.flatMap((group) =>
      group.monitorList.map((monitor) => this.mapMonitor(monitor, heartbeat)),
    );

    return this.buildDashboardData(monitors);
  }

  private mapMonitor(
    monitor: { id: number; name: string },
    heartbeat: { heartbeatList: Record<string, { status: number }[]>; uptimeList: Record<string, number> },
  ): UptimeKumaMonitor {
    const heartbeats = heartbeat.heartbeatList[String(monitor.id)] ?? [];
    const latestHeartbeat = heartbeats.at(-1);
    const uptimeKey = `${monitor.id}_24`;
    const uptimeRaw = heartbeat.uptimeList[uptimeKey];
    const uptimePercent24h = typeof uptimeRaw === "number" ? uptimeRaw * 100 : null;
    const status: UptimeKumaMonitorCategory =
      (latestHeartbeat && (uptimeKumaHeartbeatCategoryMap[latestHeartbeat.status] ?? "down")) || "paused";

    return {
      id: monitor.id,
      name: monitor.name,
      status,
      uptimePercent24h,
    };
  }

  private buildDashboardData(monitors: UptimeKumaMonitor[]): UptimeKumaDashboardData {
    const counts = monitors.reduce(
      (acc, monitor) => {
        acc[monitor.status] += 1;
        return acc;
      },
      { up: 0, down: 0, paused: 0 },
    );

    const uptimeValues = monitors
      .map((monitor) => monitor.uptimePercent24h)
      .filter((value): value is number => value !== null);

    const averageUptimePercent = uptimeValues.reduce((sum, value) => sum + value, 0) / Math.max(uptimeValues.length, 1);

    return {
      totalMonitors: monitors.length,
      upCount: counts.up,
      downCount: counts.down,
      pausedCount: counts.paused,
      averageUptimePercent,
      monitors,
    };
  }

  private async fetchOkAsync(url: string | URL) {
    const response = await fetchWithTrustedCertificatesAsync(url);
    if (!response.ok) {
      throw new ResponseError(response);
    }
    return response;
  }

  private getStatusPageAsync() {
    return this.fetchOkAsync(this.statusPageUrl());
  }

  private getHeartbeatAsync() {
    return this.fetchOkAsync(this.heartbeatUrl());
  }

  private statusPageUrl() {
    return this.url(`/api/status-page/${this.getSlug()}`);
  }

  private heartbeatUrl() {
    return this.url(`/api/status-page/heartbeat/${this.getSlug()}`);
  }

  private getSlug() {
    if (this.hasSecretValue("slug")) {
      return this.getSecretValue("slug").toLowerCase();
    }

    return "default";
  }
}
