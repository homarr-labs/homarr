import { getIntegrationName } from "./integration";
import type { WidgetKind } from "./widget";
import { widgetFeatureCatalog } from "./widget-feature-catalog";

export const getWidgetIntegrationName = (kind: WidgetKind): string | undefined => {
  const descriptor = widgetFeatureCatalog[kind];
  if (!("displayNameFromIntegration" in descriptor) || !descriptor.displayNameFromIntegration) return undefined;
  return getIntegrationName(descriptor.capability.integrations[0]);
};

type WidgetNameTranslator = (key: never) => string;

export const getWidgetName = (kind: WidgetKind, translate: WidgetNameTranslator): string =>
  getWidgetIntegrationName(kind) ?? translate(`widget.${kind}.name` as never);
