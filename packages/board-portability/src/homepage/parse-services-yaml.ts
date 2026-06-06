import { parse as parseYaml } from "yaml";

import type { HomepageService, HomepageWidget, ParseServicesYamlResult } from "./types";

const extractWidgets = (config: Record<string, unknown>): HomepageWidget[] => {
  const singular = config.widget;
  const plural = config.widgets;

  if (Array.isArray(plural)) {
    return plural.filter(isWidgetConfig).map(normalizeWidget);
  }

  if (isWidgetConfig(singular)) {
    return [normalizeWidget(singular)];
  }

  return [];
};

const isWidgetConfig = (value: unknown): value is Record<string, unknown> & { type: string } => {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "type" in value &&
    typeof value.type === "string"
  );
};

const normalizeWidget = (widget: Record<string, unknown>): HomepageWidget => {
  const { type, url, key, ...rest } = widget;
  return {
    type: String(type),
    ...(typeof url === "string" ? { url } : {}),
    ...(typeof key === "string" ? { key } : {}),
    fields: rest,
  };
};

const isServiceConfig = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const parseService = (group: string, name: string, config: Record<string, unknown>): HomepageService => {
  const icon = typeof config.icon === "string" ? config.icon : undefined;
  const href = typeof config.href === "string" ? config.href : undefined;
  const description = typeof config.description === "string" ? config.description : undefined;
  const ping = typeof config.ping === "string" ? config.ping : undefined;
  const siteMonitor = typeof config.siteMonitor === "string" ? config.siteMonitor : undefined;

  return {
    group,
    name,
    icon,
    href,
    description,
    ping,
    siteMonitor,
    widgets: extractWidgets(config),
  };
};

const collectServices = (entries: unknown[], groupPath: string): HomepageService[] => {
  const services: HomepageService[] = [];

  for (const entry of entries) {
    if (!isServiceConfig(entry)) {
      continue;
    }

    const keys = Object.keys(entry);
    if (keys.length !== 1) {
      continue;
    }

    const name = keys[0] ?? "";
    const value = entry[name];

    if (Array.isArray(value)) {
      const nestedGroup = groupPath ? `${groupPath} / ${name}` : name;
      services.push(...collectServices(value, nestedGroup));
      continue;
    }

    if (isServiceConfig(value)) {
      services.push(parseService(groupPath.length > 0 ? groupPath : "Services", name, value));
    }
  }

  return services;
};

export const parseServicesYaml = (content: string): ParseServicesYamlResult => {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { success: true, services: [] };
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(trimmed);
  } catch {
    return { success: false, error: "Invalid YAML" };
  }

  if (!Array.isArray(parsed)) {
    return { success: false, error: "Homepage services.yaml must be a YAML array" };
  }

  return { success: true, services: collectServices(parsed, "") };
};
