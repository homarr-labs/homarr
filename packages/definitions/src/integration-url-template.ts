import { removeTrailingSlash } from "@homarr/common";

import { integrationIconSlugs } from "./docker-integration-match";
import type { IntegrationKind } from "./integration";
import { getIntegrationDefaultPort } from "./integration";

export type UrlTemplateMode = "hostPort" | "subdomain";

const getSlugForKind = (kind: IntegrationKind): string => integrationIconSlugs[kind];

const buildUrl = (slug: string, host: string, mode: UrlTemplateMode, port?: number): string => {
  const modeBuilders: Record<UrlTemplateMode, () => string> = {
    subdomain: () => `https://${slug}.${host}`,
    hostPort: () => (port ? `http://${host}:${port}` : `http://${host}`),
  };
  return modeBuilders[mode]();
};

export const buildIntegrationUrl = (
  kind: IntegrationKind,
  baseHost: string,
  mode: UrlTemplateMode,
  dockerPort?: number,
): string => {
  const host = removeTrailingSlash(baseHost.trim());
  if (!host) return "";
  const port = dockerPort ?? getIntegrationDefaultPort(kind);
  return buildUrl(getSlugForKind(kind), host, mode, port ?? undefined);
};

export const buildAppUrl = (
  containerName: string,
  baseHost: string,
  mode: UrlTemplateMode,
  dockerPort?: number,
): string => {
  const host = removeTrailingSlash(baseHost.trim());
  if (!host) return "";
  const slug = containerName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return buildUrl(slug, host, mode, dockerPort);
};
