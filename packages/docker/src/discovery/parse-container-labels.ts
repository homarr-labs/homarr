import type { ContainerInfo } from "dockerode";

import { integrationKinds, widgetKinds } from "@homarr/definitions";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";

import { dockerLabels, homepageLabels } from "../labels";
import type { DiscoveredService } from "./types";

export interface ParseContainerLabelsOptions {
  readHomepageLabels?: boolean;
}

const integrationKindSet = new Set<string>(integrationKinds);
const widgetKindSet = new Set<string>(widgetKinds);

const readLabel = (labels: Record<string, string>, key: string) => {
  const value = labels[key]?.trim();
  return value ? value : undefined;
};

const resolveLabelValue = (
  labels: Record<string, string>,
  homarrKey: string,
  homepageKey: string,
  useHomepageFallback: boolean,
) => readLabel(labels, homarrKey) ?? (useHomepageFallback ? readLabel(labels, homepageKey) : undefined);

const resolveIcon = (labels: Record<string, string>, useHomepageFallback: boolean) => {
  const homarrIcon = readLabel(labels, dockerLabels.icon);
  if (homarrIcon || !useHomepageFallback) return homarrIcon;

  const homepageIcon = readLabel(labels, homepageLabels.icon);
  if (!homepageIcon || /^(mdi|si|sh)-/.test(homepageIcon)) return homepageIcon;

  // Homepage's Dashboard Icons keys default to PNG; URLs and local paths pass through.
  const dashboardIcon = /^([a-zA-Z0-9][a-zA-Z0-9_-]*)(?:\.(png|svg|webp))?$/.exec(homepageIcon);
  if (!dashboardIcon?.[1]) return homepageIcon;

  const extension = dashboardIcon[2] ?? "png";
  return `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/${extension}/${dashboardIcon[1].toLowerCase()}.${extension}`;
};

const parseIntegrationKind = (value: string | undefined): IntegrationKind | undefined =>
  value && integrationKindSet.has(value) ? (value as IntegrationKind) : undefined;

const parseWidgetKind = (value: string | undefined): WidgetKind | undefined =>
  value && widgetKindSet.has(value) ? (value as WidgetKind) : undefined;

export const createDockerSourceId = (host: string, externalId: string) =>
  `docker:${encodeURIComponent(host)}:${encodeURIComponent(externalId)}`;

export const parseContainerLabels = (
  container: Pick<ContainerInfo, "Id" | "Labels">,
  host: string,
  options: ParseContainerLabelsOptions = {},
): DiscoveredService | null => {
  const labels = container.Labels ?? {};
  if (dockerLabels.hide in labels) return null;

  const readHomepageLabels = options.readHomepageLabels ?? true;
  const useHomepageFallback = readHomepageLabels && !readLabel(labels, dockerLabels.name);
  const name = resolveLabelValue(labels, dockerLabels.name, homepageLabels.name, useHomepageFallback);
  const href = resolveLabelValue(labels, dockerLabels.href, homepageLabels.href, useHomepageFallback);
  const group = resolveLabelValue(labels, dockerLabels.group, homepageLabels.group, useHomepageFallback);
  if (!name || !href) return null;

  const externalId = readLabel(labels, dockerLabels.id) ?? container.Id;
  return {
    sourceId: createDockerSourceId(host, externalId),
    containerId: container.Id,
    host,
    group,
    name,
    href,
    icon: resolveIcon(labels, useHomepageFallback),
    description: resolveLabelValue(labels, dockerLabels.description, homepageLabels.description, useHomepageFallback),
    pingUrl: readLabel(labels, dockerLabels.ping),
    externalId,
    boardName: readLabel(labels, dockerLabels.board),
    integrationKind: parseIntegrationKind(readLabel(labels, dockerLabels.integration)),
    widgetKind: parseWidgetKind(readLabel(labels, dockerLabels.widget)),
  };
};
