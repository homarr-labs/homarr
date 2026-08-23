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

  for (const kind of objectKeys(integrationDefs)) {
    if (integrationDefs[kind].features.docker.aliases.some((alias) => alias === normalized)) return kind;
  }

  for (const kind of objectKeys(integrationDefs)) {
    if (normalized.includes(kind.toLowerCase())) return kind;
    if (normalized.includes(integrationIconSlugs[kind])) return kind;
  }

  return null;
};

interface ContainerMatchInput {
  image: string;
  name: string;
}

export const matchIntegrationKindFromContainer = (container: ContainerMatchInput): IntegrationKind | null => {
  const imageName = extractContainerImageName(container.image);
  const fromImage = matchIntegrationKind(imageName);
  if (fromImage && integrationDefs[fromImage].features.docker.discoverable) return fromImage;

  const fromName = matchIntegrationKind(container.name);
  if (fromName && integrationDefs[fromName].features.docker.discoverable) return fromName;

  return null;
};
