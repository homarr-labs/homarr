import type React from "react";
import type { LoaderComponent } from "next/dynamic";
import type { QueryClient } from "@tanstack/react-query";
import type { DefaultErrorData } from "@trpc/server/unstable-core-do-not-import";

import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import type { ServerSettings } from "@homarr/server-settings";
import type { SettingsContextProps } from "@homarr/settings/creator";
import type { stringOrTranslation } from "@homarr/translation";
import type { TablerIcon } from "@homarr/ui";

import type { WidgetImports } from ".";
import type { inferOptionsFromCreator, inferOptionsFromDefinition, WidgetOptionsRecord } from "./options";

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
}

export interface WidgetContextActionProps<
  TKind extends WidgetKind,
  TOptions extends WidgetOptionsRecord = WidgetOptionsRecord,
> {
  kind: TKind;
  options: inferOptionsFromDefinition<TOptions>;
  setOptions: (partial: Partial<inferOptionsFromDefinition<TOptions>>) => void;
  integrationIds: string[];
  context: WidgetContextMenuContext;
  widgetStateRef: React.MutableRefObject<Record<string, unknown> | null>;
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
  contextActions?: (props: Omit<WidgetContextActionProps<WidgetKind>, "kind">) => WidgetContextMenuAction[];
}

export interface WidgetProps<TKind extends WidgetKind> {
  options: inferOptionsFromCreator<WidgetOptionsRecordOf<TKind>>;
  integrationIds: string[];
  itemId: string | undefined; // undefined when in preview mode
}

export type WidgetComponentProps<TKind extends WidgetKind> = WidgetProps<TKind> & {
  boardId: string | undefined; // undefined when in preview mode
  isEditMode: boolean;
  setOptions: ({ newOptions }: { newOptions: Partial<inferOptionsFromCreator<WidgetOptionsRecordOf<TKind>>> }) => void;
  width: number;
  height: number;
  widgetStateRef?: React.MutableRefObject<Record<string, unknown> | null>;
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
