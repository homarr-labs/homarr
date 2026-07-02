import type { ContainerInfo } from "dockerode";

import { integrationKinds, widgetKinds } from "@homarr/definitions";
import type { IntegrationKind, WidgetKind } from "@homarr/definitions";

import { dockerLabels, homepageLabels } from "../labels";
import type { DiscoveredService } from "./types";

export interface ParseContainerLabelsOptions {
  readHomepageLabels?: boolean;
}

const homarrLabelKeys = {
  group: dockerLabels.group,
  name: dockerLabels.name,
  href: dockerLabels.href,
  icon: dockerLabels.icon,
  description: dockerLabels.description,
  ping: dockerLabels.ping,
  id: dockerLabels.id,
  board: dockerLabels.board,
  integration: dockerLabels.integration,
  widget: dockerLabels.widget,
} as const;

const homepageLabelKeys = {
  group: homepageLabels.group,
  name: homepageLabels.name,
  href: homepageLabels.href,
  icon: homepageLabels.icon,
  description: homepageLabels.description,
} as const;

const integrationKindSet = new Set<string>(integrationKinds);
const widgetKindSet = new Set<string>(widgetKinds);

const readLabel = (labels: Record<string, string>, key: string) => {
  const value = labels[key]?.trim();
  if (!value) {
    return undefined;
  }
  return value;
};

const resolveLabelValue = (
  labels: Record<string, string>,
  homarrKey: string,
  homepageKey: string,
  useHomepageFallback: boolean,
) => readLabel(labels, homarrKey) ?? (useHomepageFallback ? readLabel(labels, homepageKey) : undefined);

export const parseContainerLabels = (
  container: Pick<ContainerInfo, "Id" | "Labels">,
  host: string,
  options: ParseContainerLabelsOptions = {},
): DiscoveredService | null => {
  const labels = container.Labels ?? {};

  if (dockerLabels.hide in labels) {
    return null;
  }

  const readHomepageLabels = options.readHomepageLabels ?? true;
  const hasHomarrName = Boolean(readLabel(labels, dockerLabels.name));
  const useHomepageFallback = readHomepageLabels && !hasHomarrName;

  const name = resolveLabelValue(labels, homarrLabelKeys.name, homepageLabelKeys.name, useHomepageFallback);
  const href = resolveLabelValue(labels, homarrLabelKeys.href, homepageLabelKeys.href, useHomepageFallback);
  const group = resolveLabelValue(labels, homarrLabelKeys.group, homepageLabelKeys.group, useHomepageFallback);

  if (!name || !href || !group) {
    return null;
  }

  const icon =
    readLabel(labels, homarrLabelKeys.icon) ??
    (useHomepageFallback ? readLabel(labels, homepageLabelKeys.icon) : undefined);
  const description =
    readLabel(labels, homarrLabelKeys.description) ??
    (useHomepageFallback ? readLabel(labels, homepageLabelKeys.description) : undefined);
  const pingUrl = readLabel(labels, homarrLabelKeys.ping);
  const boardName = readLabel(labels, homarrLabelKeys.board);
  const externalId = readLabel(labels, homarrLabelKeys.id) ?? container.Id;

  const integrationKind = parseIntegrationKind(readLabel(labels, homarrLabelKeys.integration));
  const widgetKind = parseWidgetKind(readLabel(labels, homarrLabelKeys.widget));

  return {
    containerId: container.Id,
    host,
    group,
    name,
    href,
    icon,
    description,
    pingUrl,
    externalId,
    boardName,
    integrationKind,
    widgetKind,
  };
};

const parseIntegrationKind = (value: string | undefined): IntegrationKind | undefined => {
  if (!value || !integrationKindSet.has(value)) {
    return undefined;
  }
  return value as IntegrationKind;
};

const parseWidgetKind = (value: string | undefined): WidgetKind | undefined => {
  if (!value || !widgetKindSet.has(value)) {
    return undefined;
  }
  return value as WidgetKind;
};
