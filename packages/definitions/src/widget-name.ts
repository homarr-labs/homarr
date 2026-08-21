import type { IntegrationKind } from "./integration";
import { getIntegrationName } from "./integration";
import type { WidgetKind } from "./widget";

const widgetIntegrationKinds: Partial<Record<WidgetKind, IntegrationKind>> = {
  coolify: "coolify",
  tracearr: "tracearr",
  paperlessNgx: "paperlessNgx",
  patchmon: "patchmon",
  bazarr: "bazarr",
  uptimeKuma: "uptimeKuma",
  traefik: "traefik",
};

export const getWidgetIntegrationName = (kind: WidgetKind): string | undefined => {
  const integrationKind = widgetIntegrationKinds[kind];
  if (!integrationKind) return undefined;
  return getIntegrationName(integrationKind);
};

type WidgetNameTranslator = (key: never) => string;

export const getWidgetName = (kind: WidgetKind, translate: WidgetNameTranslator): string =>
  getWidgetIntegrationName(kind) ?? translate(`widget.${kind}.name` as never);
