import { objectKeys } from "@homarr/common";

import { integrationDefs } from "./integration";
import type { IntegrationKind } from "./integration";

export const extractContainerImageName = (image: string): string => image.split("/").at(-1)?.split(":").at(0) ?? "";

const extractIconSlug = (iconUrl: string): string => {
  const filename = iconUrl.split("/").pop() ?? "";
  return filename.replace(/\.(svg|png)$/, "").toLowerCase();
};

export const integrationIconSlugs: Record<IntegrationKind, string> = Object.fromEntries(
  objectKeys(integrationDefs).map((kind) => [kind, extractIconSlug(integrationDefs[kind].iconUrl)]),
) as Record<IntegrationKind, string>;

const integrationAliases: Partial<Record<IntegrationKind, readonly string[]>> = {
  piHole: ["pihole", "pi-hole"],
  adGuardHome: ["adguardhome", "adguard-home", "adguard"],
  homeAssistant: ["homeassistant", "home-assistant", "hass"],
  openmediavault: ["omv"],
  qBittorrent: ["qbittorrent"],
  sabNzbd: ["sabnzbd"],
  nzbGet: ["nzbget"],
  unifiController: ["unifi", "unifi-controller"],
  jellyseerr: ["jellyseerr"],
  overseerr: ["overseerr"],
  dashDot: ["dashdot", "dash-dot", "dash."],
  speedtestTracker: ["speedtest-tracker"],
  uptimeKuma: ["uptime-kuma"],
  audiobookshelf: ["audiobookshelf"],
  navidrome: ["navidrome"],
  paperlessNgx: ["paperless-ngx", "paperless"],
  coolify: ["coolify"],
  truenas: ["truenas"],
};

export const matchIntegrationKind = (search: string): IntegrationKind | null => {
  const normalized = search.toLowerCase().trim();
  if (!normalized) return null;

  for (const kind of objectKeys(integrationDefs)) {
    if (kind.toLowerCase() === normalized) return kind;
    if (integrationDefs[kind].name.toLowerCase() === normalized) return kind;
  }

  for (const kind of objectKeys(integrationDefs)) {
    if (integrationIconSlugs[kind] === normalized) return kind;
  }

  for (const [kind, aliases] of Object.entries(integrationAliases) as [IntegrationKind, readonly string[]][]) {
    if (aliases.some((alias) => alias === normalized)) return kind;
  }

  for (const kind of objectKeys(integrationDefs)) {
    if (normalized.includes(kind.toLowerCase())) return kind;
    if (normalized.includes(integrationIconSlugs[kind])) return kind;
  }

  return null;
};

const notDockerDiscoverable = new Set<IntegrationKind>(["ical", "mock"]);

interface ContainerMatchInput {
  image: string;
  name: string;
}

export const matchIntegrationKindFromContainer = (container: ContainerMatchInput): IntegrationKind | null => {
  const imageName = extractContainerImageName(container.image);
  const fromImage = matchIntegrationKind(imageName);
  if (fromImage && !notDockerDiscoverable.has(fromImage)) return fromImage;

  const fromName = matchIntegrationKind(container.name);
  if (fromName && !notDockerDiscoverable.has(fromName)) return fromName;

  return null;
};
