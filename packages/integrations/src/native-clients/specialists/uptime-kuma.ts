import type { IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import {
  uptimeKumaHeartbeatCategoryMap,
  uptimeKumaHeartbeatResponseSchema,
  uptimeKumaStatusPageResponseSchema,
} from "../../uptime-kuma/uptime-kuma-types";
import type { UptimeKumaDashboardData, UptimeKumaMonitor } from "../../uptime-kuma/uptime-kuma-types";
import { SpecialistProtocol, settleSpecialistTasksAsync, specialistParseResult } from "./protocol";

export class UptimeKumaProtocol extends SpecialistProtocol {
  private slug() {
    return this.hasSecret("slug") ? this.secret("slug").toLowerCase() : "default";
  }
  private statusPageUrl() {
    return this.url(`/api/status-page/${this.slug()}`);
  }
  private heartbeatUrl() {
    return this.url(`/api/status-page/heartbeat/${this.slug()}`);
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const http = this.testingHttp(input);
    const page = await http.responseAsync(this.statusPageUrl(), {}, async (response): Promise<TestingResult> => {
      if (!response.ok) return this.statusResult(response);
      return uptimeKumaStatusPageResponseSchema.safeParse(await response.json()).success
        ? { success: true }
        : specialistParseResult("Invalid Uptime Kuma status page response");
    });
    if (!page.success) return page;
    return http.responseAsync(this.heartbeatUrl(), {}, async (response) => {
      if (!response.ok) return this.statusResult(response);
      return uptimeKumaHeartbeatResponseSchema.safeParse(await response.json()).success
        ? { success: true }
        : specialistParseResult("Invalid Uptime Kuma heartbeat response");
    });
  }

  async getDashboardDataAsync(): Promise<UptimeKumaDashboardData> {
    return this.runAsync(async (http) => {
      const [page, heartbeat] = await settleSpecialistTasksAsync([
        http.jsonAsync(this.statusPageUrl()).then((value) => uptimeKumaStatusPageResponseSchema.parse(value)),
        http.jsonAsync(this.heartbeatUrl()).then((value) => uptimeKumaHeartbeatResponseSchema.parse(value)),
      ] as const);
      const monitors: UptimeKumaMonitor[] = page.publicGroupList.flatMap((group) =>
        group.monitorList.map((monitor) => {
          const latest = (heartbeat.heartbeatList[String(monitor.id)] ?? []).at(-1);
          const uptime = heartbeat.uptimeList[`${monitor.id}_24`];
          return {
            id: monitor.id,
            name: monitor.name,
            status: (latest && (uptimeKumaHeartbeatCategoryMap[latest.status] ?? "down")) || "paused",
            uptimePercent24h: typeof uptime === "number" ? uptime * 100 : null,
          };
        }),
      );
      const counts = monitors.reduce(
        (acc, monitor) => {
          acc[monitor.status]++;
          return acc;
        },
        { up: 0, down: 0, paused: 0 },
      );
      const uptimes = monitors
        .map((monitor) => monitor.uptimePercent24h)
        .filter((value): value is number => value !== null);
      return {
        totalMonitors: monitors.length,
        upCount: counts.up,
        downCount: counts.down,
        pausedCount: counts.paused,
        averageUptimePercent: uptimes.reduce((sum, value) => sum + value, 0) / Math.max(uptimes.length, 1),
        monitors,
      };
    });
  }
}
