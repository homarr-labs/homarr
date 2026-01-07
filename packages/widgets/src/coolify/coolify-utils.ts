import type {
  CoolifyApplicationWithContext,
  CoolifyServer,
  CoolifyServiceWithContext,
} from "@homarr/integrations/types";

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

export function formatRelativeTime(dateString: string | undefined): string | undefined {
  if (!dateString) return undefined;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return undefined;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) {
    const remainingHours = diffHour % 24;
    return remainingHours > 0 ? `${diffDay}d ${remainingHours}h ago` : `${diffDay}d ago`;
  }
  if (diffHour > 0) {
    const remainingMin = diffMin % 60;
    return remainingMin > 0 ? `${diffHour}h ${remainingMin}m ago` : `${diffHour}h ago`;
  }
  if (diffMin > 0) return `${diffMin}m ago`;
  return "just now";
}

export function getResourceTimestamp(
  item: { updated_at?: string; last_online_at?: string; status?: string },
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
  return integrationIds.slice().sort().join("-");
}

export function createStorageKey(widgetKey: string, integrationId: string, type: "sections" | "show-ip"): string {
  const cardKey = widgetKey.includes("-") ? `${widgetKey}-${integrationId}` : widgetKey;
  return `coolify-${type}-${cardKey}`;
}
