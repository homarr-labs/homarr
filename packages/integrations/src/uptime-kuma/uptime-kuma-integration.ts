import { ParseError, ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import {
  toUptimeKumaMonitorStatus,
  uptimeKumaHeartbeatResponseSchema,
  uptimeKumaIncidentStyles,
  uptimeKumaStatusPageResponseSchema,
} from "./uptime-kuma-types";
import type {
  UptimeKumaHeartbeat,
  UptimeKumaHeartbeatResponse,
  UptimeKumaIncident,
  UptimeKumaIncidentStyle,
  UptimeKumaMonitor,
  UptimeKumaStatusPage,
  UptimeKumaStatusPageResponse,
} from "./uptime-kuma-types";

const maxHeartbeatsPerMonitor = 50;
const uptimeWindowMs = 24 * 60 * 60 * 1000;

type StatusPageMonitor = UptimeKumaStatusPageResponse["publicGroupList"][number]["monitorList"][number];
type StatusPageIncident = NonNullable<UptimeKumaStatusPageResponse["incident"]>;
type RawHeartbeat = UptimeKumaHeartbeatResponse["heartbeatList"][string][number];

export class UptimeKumaIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const statusPageResponse = await input.fetchAsync(this.statusPageApiUrl());
    if (!statusPageResponse.ok) {
      return TestConnectionError.StatusResult(statusPageResponse);
    }

    const statusPageParsed = uptimeKumaStatusPageResponseSchema.safeParse(await statusPageResponse.json());
    if (!statusPageParsed.success) {
      return TestConnectionError.ParseResult(
        new ParseError("Invalid Uptime Kuma status page response", { cause: statusPageParsed.error }),
      );
    }

    const heartbeatResponse = await input.fetchAsync(this.heartbeatApiUrl());
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

  public async getStatusPageAsync(): Promise<UptimeKumaStatusPage> {
    const [statusPageResponse, heartbeatResponse] = await Promise.all([
      this.fetchOkAsync(this.statusPageApiUrl()),
      this.fetchOkAsync(this.heartbeatApiUrl()),
    ]);

    const statusPage = uptimeKumaStatusPageResponseSchema.parse(await statusPageResponse.json());
    const heartbeat = uptimeKumaHeartbeatResponseSchema.parse(await heartbeatResponse.json());
    const slug = this.getSlug();

    return {
      slug,
      title: statusPage.config?.title?.trim() || slug,
      url: this.externalUrl(`/status/${encodeURIComponent(slug)}`).toString(),
      groups: statusPage.publicGroupList.map((group) => ({
        id: group.id,
        name: group.name,
        monitors: group.monitorList.map((monitor) => mapMonitor(monitor, heartbeat)),
      })),
      incidents: [...(statusPage.incidents ?? []), ...(statusPage.incident ? [statusPage.incident] : [])].map(
        mapIncident,
      ),
      maintenances: (statusPage.maintenanceList ?? []).map((maintenance) => ({
        id: maintenance.id,
        title: maintenance.title?.trim() || "",
        description: maintenance.description?.trim() || null,
      })),
    };
  }

  private async fetchOkAsync(url: URL) {
    const response = await fetchWithTrustedCertificatesAsync(url);
    if (!response.ok) {
      throw new ResponseError(response);
    }
    return response;
  }

  private statusPageApiUrl() {
    return this.url(`/api/status-page/${encodeURIComponent(this.getSlug())}`);
  }

  private heartbeatApiUrl() {
    return this.url(`/api/status-page/heartbeat/${encodeURIComponent(this.getSlug())}`);
  }

  private getSlug() {
    if (this.hasSecretValue("slug")) {
      return this.getSecretValue("slug").trim().toLowerCase();
    }

    return "default";
  }
}

const mapMonitor = (monitor: StatusPageMonitor, response: UptimeKumaHeartbeatResponse): UptimeKumaMonitor => {
  const heartbeats = (response.heartbeatList[String(monitor.id)] ?? [])
    .flatMap(mapHeartbeat)
    .toSorted((left, right) => left.time - right.time)
    .slice(-maxHeartbeatsPerMonitor);
  const latest = heartbeats.at(-1);
  const uptimeRatio = response.uptimeList[`${monitor.id}_24`];
  const checkedWithinUptimeWindow = latest !== undefined && Date.now() - latest.time <= uptimeWindowMs;

  return {
    id: monitor.id,
    name: monitor.name,
    type: monitor.type ?? null,
    url: monitor.url?.trim() || null,
    status: latest?.status ?? "unknown",
    uptime24h:
      checkedWithinUptimeWindow && typeof uptimeRatio === "number"
        ? Math.min(100, Math.max(0, uptimeRatio * 100))
        : null,
    ping: latest?.ping ?? null,
    averagePing: averagePing(heartbeats),
    lastCheckAt: latest?.time ?? null,
    statusSince: getStatusSince(heartbeats),
    certificateDaysRemaining: getCertificateDaysRemaining(monitor),
    tags: (monitor.tags ?? []).map((tag) => ({
      name: tag.name,
      color: tag.color ?? null,
      value: tag.value?.trim() || null,
    })),
    heartbeats,
  };
};

const mapHeartbeat = (heartbeat: RawHeartbeat): UptimeKumaHeartbeat[] => {
  const time = parseUptimeKumaDate(heartbeat.time);
  if (time === null) return [];
  return [{ status: toUptimeKumaMonitorStatus(heartbeat.status), time, ping: heartbeat.ping ?? null }];
};

const mapIncident = (incident: StatusPageIncident): UptimeKumaIncident => ({
  id: incident.id,
  title: incident.title?.trim() || "",
  content: incident.content?.trim() || null,
  style: isIncidentStyle(incident.style) ? incident.style : "warning",
  createdAt: parseUptimeKumaDate(incident.createdDate),
  updatedAt: parseUptimeKumaDate(incident.lastUpdatedDate),
});

const isIncidentStyle = (style: string | null | undefined): style is UptimeKumaIncidentStyle =>
  uptimeKumaIncidentStyles.some((value) => value === style);

const averagePing = (heartbeats: readonly UptimeKumaHeartbeat[]) => {
  const pings = heartbeats.flatMap((heartbeat) => (heartbeat.ping === null ? [] : [heartbeat.ping]));
  if (pings.length === 0) return null;
  return pings.reduce((sum, ping) => sum + ping, 0) / pings.length;
};

const getStatusSince = (heartbeats: readonly UptimeKumaHeartbeat[]) => {
  const latest = heartbeats.at(-1);
  if (!latest) return null;

  for (let index = heartbeats.length - 2; index >= 0; index--) {
    if (heartbeats[index]?.status !== latest.status) return heartbeats[index + 1]?.time ?? null;
  }
  return null;
};

const getCertificateDaysRemaining = (monitor: StatusPageMonitor) => {
  if (monitor.validCert !== true || typeof monitor.certExpiryDaysRemaining !== "number") return null;
  return monitor.certExpiryDaysRemaining;
};

const parseUptimeKumaDate = (value: string | null | undefined) => {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const time = Date.parse(hasOffset ? normalized : `${normalized}Z`);
  return Number.isNaN(time) ? null : time;
};
