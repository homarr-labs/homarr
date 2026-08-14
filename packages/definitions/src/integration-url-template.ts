import { removeTrailingSlash } from "@homarr/common";

import { integrationIconSlugs } from "./docker-integration-match";
import type { IntegrationKind } from "./integration";
import { getIntegrationDefaultPort } from "./integration";

export type UrlTemplateMode = "hostPort" | "subdomain" | "path";

const getSlugForKind = (kind: IntegrationKind): string => integrationIconSlugs[kind];

const normalizeBaseHost = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = trimmed.includes("://") ? trimmed : `http://${trimmed}`;
    const authority = url
      .match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/iu)?.[1]
      ?.split("@")
      .at(-1);
    const explicitPort = authority?.match(/^(?:\[[^\]]+\]|[^:]+):(\d+)$/u)?.[1];
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : explicitPort ? Number(explicitPort) : undefined,
      pathname: parsed.pathname.replace(/\/+$/, ""),
    };
  } catch {
    return null;
  }
};

const buildUrl = (slug: string, rawHost: string, mode: UrlTemplateMode, port?: number): string => {
  const base = normalizeBaseHost(rawHost);
  if (!base) return "";
  const effectivePort = port ?? base.port;
  const modeBuilders: Record<UrlTemplateMode, () => string> = {
    subdomain: () => (base.hostname.startsWith("[") ? "" : `https://${slug}.${base.hostname}`),
    hostPort: () => (effectivePort ? `http://${base.hostname}:${effectivePort}` : `http://${base.hostname}`),
    path: () => `${base.protocol}//${base.hostname}${base.port ? `:${base.port}` : ""}${base.pathname}/${slug}`,
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
  const slug = containerName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return buildUrl(slug, host, mode, dockerPort);
};
