import type { Database, like as drizzleLike, or as drizzleOr } from "@homarr/db";
import type { icons } from "@homarr/db/schema";
import { extractContainerImageName, getIconUrl, matchIntegrationKindFromContainer } from "@homarr/definitions";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import type { createDockerSourceId, dockerLabels, DockerDiscoveryResult } from "@homarr/docker";

export interface SetupDiscoveryResources {
  readonly dockerLabels: Pick<typeof dockerLabels, "hide">;
  readonly createDockerSourceId: typeof createDockerSourceId;
  readonly icons: typeof icons;
  readonly operators: { readonly like: typeof drizzleLike; readonly or: typeof drizzleOr };
  listDiscoveredContainers(): Promise<DockerDiscoveryResult>;
  warn(error: ErrorWithMetadata): void;
}

interface DiscoveredBase {
  sourceId: string;
  containerId: string;
  containerName: string;
  suggestedUrl: string;
  publishedPort: number | null;
  iconUrl: string | null;
  source: "label" | "docker";
  group?: string;
  boardName?: string;
  host: string;
  widgetKind?: WidgetKind;
  description?: string;
  pingUrl?: string;
}
export interface DiscoveredIntegration extends DiscoveredBase {
  kind: IntegrationKind;
}
export interface DiscoveredApp extends DiscoveredBase {
  detectedType?: string;
}

export function buildSuggestedUrl(ports: { IP?: string; PublicPort?: number }[] | undefined, host: string) {
  const port = ports?.find((candidate) => candidate.PublicPort !== undefined);
  if (!port?.PublicPort) return { url: "", publishedPort: null };
  const configuredHost = host === "socket" || host.startsWith("/") ? null : host.replace(/:\d+$/, "");
  const ip = port.IP && port.IP !== "0.0.0.0" && port.IP !== "::" ? port.IP : configuredHost;
  return { url: ip ? `http://${ip}:${port.PublicPort}` : "", publishedPort: port.PublicPort };
}

export async function discoverDockerServices(db: Database, resources: SetupDiscoveryResources) {
  const empty = { integrations: [] as DiscoveredIntegration[], apps: [] as DiscoveredApp[] };
  const {
    icons,
    dockerLabels,
    createDockerSourceId,
    operators: { like, or },
  } = resources;
  try {
    const discovery = await resources.listDiscoveredContainers();
    const successfulHosts = discovery.hosts.filter((host) => host.status === "success");
    const unavailableHosts = discovery.hosts.filter((host) => host.status === "unavailable");
    const containers = successfulHosts.flatMap((hostResult) =>
      hostResult.containers
        .filter((container) => !(dockerLabels.hide in (container.Labels ?? {})))
        .map((container) => ({ ...container, host: hostResult.host })),
    );
    const labeledKeys = new Set(
      discovery.services.map((service) => createDockerSourceId(service.host, service.containerId)),
    );
    const imageCandidates = containers.filter(
      (container) => !labeledKeys.has(createDockerSourceId(container.host, container.Id)),
    );
    const imageNames = [
      ...new Set(imageCandidates.map((container) => extractContainerImageName(container.Image)).filter(Boolean)),
    ].slice(0, 64);
    const likeQueries = imageNames.map((name) => like(icons.name, `%${name}%`));
    const dbIcons = likeQueries.length > 0 ? await db.query.icons.findMany({ where: or(...likeQueries) }) : [];
    const strictMatch = (imageName: string) => {
      const normalized = imageName.toLowerCase().trim();
      if (normalized.length < 3) return null;
      return (
        dbIcons.find((icon) => icon.name.toLowerCase() === normalized) ??
        dbIcons.find((icon) => icon.name.toLowerCase().startsWith(normalized)) ??
        null
      );
    };
    const discoveredIntegrations: DiscoveredIntegration[] = [];
    const discoveredApps: DiscoveredApp[] = [];
    for (const service of discovery.services) {
      if (service.integrationKind) {
        discoveredIntegrations.push({
          sourceId: service.sourceId,
          containerId: service.containerId,
          containerName: service.name,
          kind: service.integrationKind,
          suggestedUrl: service.href,
          publishedPort: null,
          iconUrl: service.icon ?? getIconUrl(service.integrationKind),
          source: "label",
          group: service.group,
          boardName: service.boardName,
          host: service.host,
          widgetKind: service.widgetKind,
          description: service.description,
          pingUrl: service.pingUrl,
        });
      } else {
        discoveredApps.push({
          sourceId: service.sourceId,
          containerId: service.containerId,
          containerName: service.name,
          suggestedUrl: service.href,
          publishedPort: null,
          iconUrl: service.icon ?? null,
          source: "label",
          group: service.group,
          boardName: service.boardName,
          host: service.host,
          widgetKind: service.widgetKind,
          description: service.description,
          pingUrl: service.pingUrl,
        });
      }
    }
    for (const container of imageCandidates) {
      const imageName = extractContainerImageName(container.Image);
      const containerName = container.Names[0]?.split("/")[1] ?? "Unknown";
      const dbIcon = strictMatch(imageName);
      const iconUrl =
        dbIcon?.url ??
        `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/${imageName.toLowerCase()}.svg`;
      const { url: suggestedUrl, publishedPort } = buildSuggestedUrl(container.Ports, container.host);
      const kind = matchIntegrationKindFromContainer({ image: container.Image, name: containerName });
      const sourceId = createDockerSourceId(container.host, container.Id);
      if (kind)
        discoveredIntegrations.push({
          sourceId,
          containerId: container.Id,
          containerName,
          kind,
          suggestedUrl,
          publishedPort,
          iconUrl,
          source: "docker",
          host: container.host,
        });
      else if (dbIcon)
        discoveredApps.push({
          sourceId,
          containerId: container.Id,
          containerName,
          suggestedUrl,
          publishedPort,
          iconUrl,
          detectedType: dbIcon.name,
          source: "docker",
          host: container.host,
        });
    }
    const hosts = discovery.hosts.map((host) =>
      host.status === "success"
        ? { host: host.host, status: host.status, containerCount: host.containers.length }
        : { host: host.host, status: host.status, reason: host.reason, containerCount: 0 },
    );
    const status =
      successfulHosts.length === 0
        ? "unavailable"
        : unavailableHosts.length > 0
          ? "partial"
          : discoveredIntegrations.length === 0 && discoveredApps.length === 0
            ? "empty"
            : "success";
    return { status, hosts, integrations: discoveredIntegrations, apps: discoveredApps };
  } catch (error) {
    resources.warn(new ErrorWithMetadata("Docker discovery failed during onboarding", {}, { cause: error }));
    const reason = error instanceof Error ? error.message : "Docker discovery failed";
    return {
      status: "unavailable" as const,
      hosts: [{ host: "unknown", status: "unavailable" as const, reason, containerCount: 0 }],
      ...empty,
    };
  }
}
