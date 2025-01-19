import type { LoaderComponent } from "next/dynamic";
import type { DefaultErrorData } from "@trpc/server/unstable-core-do-not-import";

import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import type { stringOrTranslation } from "@homarr/translation";
import type { TablerIcon } from "@homarr/ui";

import type { WidgetImports } from ".";
import type { inferOptionsFromDefinition, WidgetOptionsRecord } from "./options";

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
  options: WidgetOptionsRecord;
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
}

export interface WidgetProps<TKind extends WidgetKind> {
  options: inferOptionsFromDefinition<WidgetOptionsRecordOf<TKind>>;
  integrationIds: string[];
  itemId: string | undefined; // undefined when in preview mode
}

export type WidgetComponentProps<TKind extends WidgetKind> = WidgetProps<TKind> & {
  boardId: string | undefined; // undefined when in preview mode
  isEditMode: boolean;
  setOptions: ({
    newOptions,
  }: {
    newOptions: Partial<inferOptionsFromDefinition<WidgetOptionsRecordOf<TKind>>>;
  }) => void;
  width: number;
  height: number;
};

export type WidgetOptionsRecordOf<TKind extends WidgetKind> = WidgetImports[TKind]["definition"]["options"];
