import type { WidgetKind } from "./widget";
import type { WidgetIntegrationKind, WidgetKindWithIntegration } from "./widget-integration-map";

export type inferSupportedIntegrations<TKind extends WidgetKind> = [TKind] extends [WidgetKindWithIntegration]
  ? WidgetIntegrationKind<Extract<TKind, WidgetKindWithIntegration>>
  : string;
