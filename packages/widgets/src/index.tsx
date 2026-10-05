import type { WidgetComponentProps } from "./definition";

export { AssistantWidgetRendererProvider } from "./assistant/context";
export type {
  NormalizedWidgetQuery,
  WidgetDefinition,
  WidgetContextMenuAction,
  WidgetContextActionProps,
  WidgetOptionsSettings,
  WidgetQueryMatcher,
  WidgetQueryMatcherScope,
  WidgetRuntimeActions,
  WidgetRuntimeRef,
  WidgetRuntimeState,
} from "./definition";
export {
  createWidgetRuntimeState,
  getWidgetQueryKeys,
  getWidgetRuntimeQueries,
  normalizeWidgetQuery,
  supportsAdvancedFocus,
  widgetQueryValueEquals,
} from "./definition";
export type { WidgetComponentProps };
export type { WidgetOptionDefinition, WidgetOptionType } from "./options";
export type {
  inferSupportedIntegrations,
  inferSupportedIntegrationsStrict,
  WidgetImportKey,
  WidgetImports,
} from "./registry";
