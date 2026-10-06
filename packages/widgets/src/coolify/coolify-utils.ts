import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import type {
  CoolifyApplicationWithContext,
  CoolifyServer,
  CoolifyServiceWithContext,
} from "@homarr/integrations/types";

dayjs.extend(relativeTime);

export function parseStatus(status: string): string {
  const firstPart = status.split(":")[0]?.toLowerCase();
  if (!firstPart) return "unknown";
  return firstPart;
}

export function cleanFqdn(fqdn: string | undefined | null): string | undefined {
  if (!fqdn) return undefined;
  const firstUrl = fqdn.split(",")[0]?.trim();
  if (!firstUrl) return undefined;
  try {
    const url = new URL(firstUrl);
    return `${url.protocol}//${url.host}${url.pathname}`.replace(/\/$/, "");
  } catch {
    return firstUrl;
  }
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    running: "green",
    stopped: "red",
    exited: "red",
    starting: "yellow",
    restarting: "yellow",
  };
  return colors[status] ?? "gray";
}

export function getBadgeColor(running: number, total: number): string {
  if (total === 0) return "gray";
  if (running === total) return "green";
  if (running > 0) return "yellow";
  return "red";
}

export function formatRelativeTime(dateString: string | null | undefined): string | undefined {
  if (!dateString) return undefined;
  const date = dayjs(dateString);
  return date.isValid() ? date.fromNow() : undefined;
}

export function getResourceTimestamp(
  item: { updated_at?: string | null; last_online_at?: string | null; status?: string | null },
  resourceType: "application" | "service",
): string | undefined {
  const status = parseStatus(item.status ?? "");
  const isRunning = status === "running";

  if (isRunning) return undefined;

  const timestamp = resourceType === "application" ? (item.last_online_at ?? item.updated_at) : item.updated_at;
  return formatRelativeTime(timestamp);
}

export function buildServerResourceCounts(
  servers: CoolifyServer[],
  applications: CoolifyApplicationWithContext[],
  services: CoolifyServiceWithContext[],
): Map<number, { apps: number; services: number }> {
  const serverResourceCounts = new Map<number, { apps: number; services: number }>();

  for (const server of servers) {
    const serverId = server.settings?.server_id ?? server.id ?? 0;
    serverResourceCounts.set(serverId, { apps: 0, services: 0 });
  }

  const destinationToServer = new Map<number, number>();
  for (const service of services) {
    if (service.destination_id != null && service.server_id != null) {
      destinationToServer.set(service.destination_id, service.server_id);
    }
  }

  for (const app of applications) {
    const serverId = app.server_id ?? destinationToServer.get(app.destination_id ?? 0) ?? app.destination_id ?? 0;
    const counts = serverResourceCounts.get(serverId);
    if (counts) {
      counts.apps++;
    }
  }

  for (const service of services) {
    const serverId = service.server_id ?? service.destination_id ?? 0;
    const counts = serverResourceCounts.get(serverId);
    if (counts) {
      counts.services++;
    }
  }

  return serverResourceCounts;
}

export function createWidgetKey(integrationIds: string[]): string {
  return integrationIds.toSorted().join("-");
}

export function createStorageKey(widgetKey: string, integrationId: string, type: "sections" | "show-ip"): string {
  const cardKey = widgetKey.includes("-") ? `${widgetKey}-${integrationId}` : widgetKey;
  return `coolify-${type}-${cardKey}`;
}

interface CoolifySectionOptions {
  showServers: boolean;
  showApplications: boolean;
  showServices: boolean;
}

export function getCoolifySectionVisibility(
  options: CoolifySectionOptions,
  displayMode?: "compact" | "advanced",
): CoolifySectionOptions {
  if (displayMode === "advanced") {
    return { showServers: true, showApplications: true, showServices: true };
  }
  return options;
}

export function getCoolifyServerState(server: CoolifyServer, field: "is_reachable" | "is_usable"): boolean | undefined {
  return server[field] ?? server.settings?.[field] ?? undefined;
}

export const isCoolifyServerOnline = (server: CoolifyServer): boolean =>
  getCoolifyServerState(server, "is_reachable") === true;
