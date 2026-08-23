import { widgetFeatureCatalog } from "./widget-feature-catalog";

export * from "./widget-feature-catalog";
export type { WidgetFeatureDescriptor } from "./widget-feature-catalog";

export type WidgetKind = keyof typeof widgetFeatureCatalog;

export const widgetKinds = Object.keys(widgetFeatureCatalog) as unknown as readonly [WidgetKind, ...WidgetKind[]];

const createWidgetDefaultSizes = () => {
  const result: Partial<Record<WidgetKind, { width: number; height: number }>> = {};
  for (const kind of widgetKinds) {
    const descriptor = widgetFeatureCatalog[kind];
    if ("defaultSize" in descriptor) result[kind] = descriptor.defaultSize;
  }
  return result;
};

export const widgetDefaultSizes = createWidgetDefaultSizes();
