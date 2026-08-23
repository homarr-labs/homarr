import type { WidgetKind } from "../widget";
import { widgetFeatureCatalog, widgetKinds } from "../widget";

export const widgetDocSlugs = Object.fromEntries(
  widgetKinds.map((kind) => [kind, widgetFeatureCatalog[kind].documentationSlug]),
) as Record<WidgetKind, string | null>;
