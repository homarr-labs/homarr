import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import type {
  CoolifyApplicationWithContext,
  CoolifyInstanceInfo,
  CoolifyProjectWithEnvironments,
  CoolifyServer,
  CoolifyServiceWithContext,
} from "@homarr/integrations/types";

dayjs.extend(relativeTime);

export type CoolifyStatus = "running" | "stopped" | "exited" | "starting" | "restarting" | "unhealthy" | "unknown";

export function parseStatus(status: string): CoolifyStatus {
  const [firstPart, health, ...qualifiers] = status.toLowerCase().split(":");
  if (
    health === "unhealthy" &&
    (firstPart === "degraded" || (firstPart === "running" && !qualifiers.includes("excluded")))
  ) {
    return "unhealthy";
  }
  if (
    firstPart === "running" ||
    firstPart === "stopped" ||
    firstPart === "exited" ||
    firstPart === "starting" ||
    firstPart === "restarting"
  ) {
    return firstPart;
  }
  return "unknown";
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
    online: "green",
    stopped: "red",
    exited: "red",
    starting: "yellow",
    restarting: "yellow",
    unhealthy: "red",
    offline: "red",
    unusable: "red",
  };
  return colors[status] ?? "gray";
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

export interface CoolifyProjectSummary {
  project: CoolifyProjectWithEnvironments;
  applications: number;
  services: number;
  contextAvailable: boolean;
}

export function getCoolifyProjectSummaries(info: CoolifyInstanceInfo): CoolifyProjectSummary[] {
  if (!info.projects) return [];

  return info.projects
    .map((project) => ({
      project,
      applications: info.applications.filter((app) => app.projectUuid === project.uuid).length,
      services: info.services.filter((service) => service.projectUuid === project.uuid).length,
      contextAvailable: Array.isArray(project.environments),
    }))
    .toSorted((first, second) => first.project.name.localeCompare(second.project.name));
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

export const isCoolifyServerHealthy = (server: CoolifyServer): boolean =>
  isCoolifyServerOnline(server) && getCoolifyServerState(server, "is_usable") !== false;

export interface CoolifyAttentionItem {
  kind: "server" | "application" | "service";
  uuid: string;
  name: string;
  status: Exclude<CoolifyStatus, "running"> | "offline" | "unusable";
  projectUuid?: string;
  environmentUuid?: string;
  projectName?: string;
  environmentName?: string;
}

export function getCoolifyAttentionSummary(
  items: CoolifyAttentionItem[],
  trackedCount: number,
): { kind: "problem" | "transition" | "unknown" | "healthy" | "empty"; count: number } {
  const problemCount = items.filter(
    ({ status }) => status !== "starting" && status !== "restarting" && status !== "unknown",
  ).length;
  if (problemCount > 0) return { kind: "problem", count: problemCount };

  const transitionCount = items.filter(({ status }) => status === "starting" || status === "restarting").length;
  if (transitionCount > 0) return { kind: "transition", count: transitionCount };

  if (items.length > 0) return { kind: "unknown", count: items.length };
  return { kind: trackedCount > 0 ? "healthy" : "empty", count: 0 };
}

const attentionPriority: Record<string, number> = {
  offline: 0,
  unusable: 0,
  unhealthy: 0,
  exited: 0,
  stopped: 0,
  starting: 1,
  restarting: 1,
  unknown: 2,
};

export function getCoolifyAttentionItems(
  info: CoolifyInstanceInfo,
  options: CoolifySectionOptions,
): CoolifyAttentionItem[] {
  const items: CoolifyAttentionItem[] = [];
  if (options.showServers) {
    for (const server of info.servers) {
      if (isCoolifyServerHealthy(server)) continue;
      items.push({
        kind: "server",
        uuid: server.uuid,
        name: server.name,
        status:
          getCoolifyServerState(server, "is_reachable") === false
            ? "offline"
            : getCoolifyServerState(server, "is_usable") === false
              ? "unusable"
              : "unknown",
      });
    }
  }
  for (const [kind, resources] of [
    ["application", options.showApplications ? info.applications : []],
    ["service", options.showServices ? info.services : []],
  ] as const) {
    for (const resource of resources) {
      const status = parseStatus(resource.status ?? "");
      if (status === "running") continue;
      items.push({
        kind,
        uuid: resource.uuid,
        name: resource.name,
        status,
        projectUuid: resource.projectUuid,
        environmentUuid: resource.environmentUuid,
        projectName: resource.projectName,
        environmentName: resource.environmentName,
      });
    }
  }
  return items.toSorted((a, b) => (attentionPriority[a.status] ?? 2) - (attentionPriority[b.status] ?? 2));
}
