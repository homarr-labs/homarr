import { integrationIconSlugs } from "./docker-integration-match";
import type { IntegrationKind } from "./integration";
import { getIntegrationDefaultPort } from "./integration";

export type UrlTemplateMode = "hostPort" | "subdomain";

const getSlugForKind = (kind: IntegrationKind): string =>
  integrationIconSlugs[kind] ?? kind.toLowerCase();

export const buildIntegrationUrl = (
  kind: IntegrationKind,
  baseHost: string,
  mode: UrlTemplateMode,
  dockerPort?: number,
): string => {
  const host = baseHost.trim().replace(/\/+$/, "");
  if (!host) return "";

  const slug = getSlugForKind(kind);

  const modeBuilders: Record<UrlTemplateMode, () => string> = {
    subdomain: () => `http://${slug}.${host}`,
    hostPort: () => {
      const port = dockerPort ?? getIntegrationDefaultPort(kind);
      return port ? `http://${host}:${port}` : `http://${host}`;
    },
  };

  return modeBuilders[mode]();
};
