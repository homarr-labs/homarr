import type React from "react";
import type { LoaderComponent } from "next/dynamic";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { hashKey } from "@tanstack/react-query";
import type { DefaultErrorData } from "@trpc/server/unstable-core-do-not-import";

import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import type { ServerSettings } from "@homarr/server-settings";
import type { SettingsContextProps } from "@homarr/settings/creator";
import type { stringOrTranslation } from "@homarr/translation";
import type { TablerIcon } from "@homarr/ui";

import type { WidgetImports } from ".";
import type { inferOptionsFromCreator, WidgetOptionsRecord } from "./options";

export interface WidgetContextMenuAction {
  key: string;
  label: stringOrTranslation;
  icon?: TablerIcon;
  onClick: () => void;
  hidden?: boolean;
  disabled?: boolean;
  color?: string;
}

export interface WidgetContextMenuContext {
  isEditMode: boolean;
  boardId: string | undefined;
  itemId: string | undefined;
  canInteractWithSelectedIntegrations: boolean;
}

export interface WidgetRuntimeActions {
  togglePolling?: () => void;
  testAllIndexers?: () => void;
  previousPhoto?: () => void;
  nextPhoto?: () => void;
  toggleSlideshow?: () => void;
}

export interface WidgetRuntimeState {
  queries: readonly NormalizedWidgetQuery[];
  actions: WidgetRuntimeActions;
}

export type WidgetRuntimeRef = React.MutableRefObject<WidgetRuntimeState>;

export const createWidgetRuntimeState = (): WidgetRuntimeState => ({
  queries: [],
  actions: {},
});

export interface NormalizedWidgetQuery {
  path: readonly string[];
  input: unknown;
}

export interface WidgetQueryMatcherScope {
  itemId: string;
  boardId: string | undefined;
  integrationIds: readonly string[];
  options: Record<string, unknown>;
  runtimeQueries: readonly NormalizedWidgetQuery[];
}

export type WidgetQueryMatcher = (query: NormalizedWidgetQuery, scope: WidgetQueryMatcherScope) => boolean;

export interface WidgetContextActionProps {
  options: Record<string, unknown>;
  setOptions: (partial: Record<string, unknown>) => void;
  integrationIds: string[];
  context: WidgetContextMenuContext;
  widgetRuntimeRef: WidgetRuntimeRef;
}

const createWithDynamicImport =
  <TKind extends WidgetKind, TDefinition extends WidgetDefinition>(kind: TKind, definition: TDefinition) =>
  (componentLoader: () => LoaderComponent<WidgetComponentProps<TKind>>) => ({
    definition: {
      ...definition,
      kind,
    },
    kind,
    componentLoader,
  });

export type PrefetchLoader<TKind extends WidgetKind> = () => Promise<{ default: Prefetch<TKind> }>;
export type Prefetch<TKind extends WidgetKind> = (
  queryClient: QueryClient,
  items: {
    options: inferOptionsFromCreator<WidgetOptionsRecordOf<TKind>>;
    integrationIds: string[];
  }[],
) => Promise<void>;

export const createWidgetDefinition = <TKind extends WidgetKind, TDefinition extends WidgetDefinition>(
  kind: TKind,
  definition: TDefinition,
) => ({
  withDynamicImport: createWithDynamicImport(kind, definition),
});

export interface WidgetDefinition {
  icon: TablerIcon;
  supportsAdvancedFocus?: boolean;
  queryKey?: QueryKey;
  queryKeys?: readonly QueryKey[];
  queryMatcher?: WidgetQueryMatcher;
  refetchInterval?: number | null;
  supportedIntegrations?: IntegrationKind[];
  integrationsRequired?: boolean;
  maxIntegrations?: number;
  createOptions: (
    settings: Pick<SettingsContextProps, "enableStatusByDefault" | "forceDisableStatus">,
  ) => WidgetOptionsRecord;
  errors?: Partial<
    Record<
      DefaultErrorData["code"],
      {
        icon: TablerIcon;
        message: stringOrTranslation;
        hideLogsLink?: boolean;
      }
    >
  >;
  contextActions?: (props: WidgetContextActionProps) => WidgetContextMenuAction[];
}

export const supportsAdvancedFocus = (definition: object) =>
  "supportsAdvancedFocus" in definition && definition.supportsAdvancedFocus === true;

export const getWidgetQueryKeys = (
  definition: {
    kind?: string;
    queryKey?: QueryKey;
    queryKeys?: readonly QueryKey[];
  },
  kind?: WidgetKind,
): readonly QueryKey[] => {
  if (definition.queryKeys && definition.queryKeys.length > 0) return definition.queryKeys;
  return [definition.queryKey ?? [["widget", definition.kind ?? kind]]];
};

export const normalizeWidgetQuery = (queryKey: QueryKey): NormalizedWidgetQuery | null => {
  const path = queryKey[0];
  if (!Array.isArray(path) || !path.every((part): part is string => typeof part === "string")) return null;

  const queryKeyOptions = queryKey[1];
  const input = isRecord(queryKeyOptions) && "input" in queryKeyOptions ? queryKeyOptions.input : undefined;
  return { path, input };
};

export const getWidgetRuntimeQueries = (widgetRuntimeRef: WidgetRuntimeRef): readonly NormalizedWidgetQuery[] =>
  widgetRuntimeRef.current.queries;

export const matchesWidgetRuntimeQuery: WidgetQueryMatcher = (query, scope) =>
  scope.runtimeQueries.some(
    (runtimeQuery) =>
      widgetQueryValueEquals(runtimeQuery.path, query.path) && widgetQueryValueEquals(runtimeQuery.input, query.input),
  );

export const widgetQueryInputMatches = (input: unknown, expected: Record<string, unknown>) =>
  isRecord(input) && Object.entries(expected).every(([key, value]) => widgetQueryValueEquals(input[key], value));

export const widgetQueryValueEquals = (left: unknown, right: unknown) => hashKey([left]) === hashKey([right]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export interface WidgetProps<TKind extends WidgetKind> {
  options: inferOptionsFromCreator<WidgetOptionsRecordOf<TKind>>;
  integrationIds: string[];
  itemId: string | undefined; // undefined when in preview mode
}

export type WidgetComponentProps<TKind extends WidgetKind> = WidgetProps<TKind> & {
  boardId: string | undefined; // undefined when in preview mode
  isEditMode: boolean;
  displayMode?: "compact" | "advanced";
  setOptions: ({ newOptions }: { newOptions: Partial<inferOptionsFromCreator<WidgetOptionsRecordOf<TKind>>> }) => void;
  width: number;
  height: number;
  displayScale?: number;
  widgetRuntimeRef?: WidgetRuntimeRef;
  widgetStateRef?: React.MutableRefObject<Record<string, unknown> | null>;
  removeItem?: () => void;
};

export type WidgetOptionsRecordOf<TKind extends WidgetKind> = WidgetImports[TKind]["definition"]["createOptions"];

/**
 * The following type should only include values that can be available for user (including anonymous).
 * Because they need to be provided to the client to for example set certain default values.
 */
export interface WidgetOptionsSettings {
  server: {
    board: Pick<ServerSettings["board"], "enableStatusByDefault" | "forceDisableStatus">;
  };
}
