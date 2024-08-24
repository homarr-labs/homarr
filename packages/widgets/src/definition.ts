import type { LoaderComponent } from "next/dynamic";
import type { DefaultErrorData } from "@trpc/server/unstable-core-do-not-import";

import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import type { stringOrTranslation } from "@homarr/translation";
import type { TablerIcon } from "@homarr/ui";

import type { WidgetImports } from ".";
import type { inferOptionsFromDefinition, WidgetOptionsRecord } from "./options";

type ServerDataLoader<TKind extends WidgetKind> = () => Promise<{
  default: (props: WidgetProps<TKind>) => Promise<Record<string, unknown>>;
}>;

const createWithDynamicImport =
  <
    TKind extends WidgetKind,
    TDefinition extends WidgetDefinition,
    TServerDataLoader extends ServerDataLoader<TKind> | undefined,
  >(
    kind: TKind,
    definition: TDefinition,
    serverDataLoader: TServerDataLoader,
  ) =>
  (
    componentLoader: () => LoaderComponent<
      WidgetComponentProps<TKind> &
        (TServerDataLoader extends ServerDataLoader<TKind>
          ? {
              serverData: Awaited<ReturnType<Awaited<ReturnType<TServerDataLoader>>["default"]>>;
            }
          : never)
    >,
  ) => ({
    definition: {
      ...definition,
      kind,
    },
    kind,
    serverDataLoader,
    componentLoader,
  });

const createWithServerData =
  <TKind extends WidgetKind, TDefinition extends WidgetDefinition>(kind: TKind, definition: TDefinition) =>
  <TServerDataLoader extends ServerDataLoader<TKind>>(serverDataLoader: TServerDataLoader) => ({
    definition: {
      ...definition,
      kind,
    },
    kind,
    serverDataLoader,
    withDynamicImport: createWithDynamicImport(kind, definition, serverDataLoader),
  });

export const createWidgetDefinition = <TKind extends WidgetKind, TDefinition extends WidgetDefinition>(
  kind: TKind,
  definition: TDefinition,
) => ({
  withServerData: createWithServerData(kind, definition),
  withDynamicImport: createWithDynamicImport(kind, definition, undefined),
});

export interface WidgetDefinition {
  icon: TablerIcon;
  supportedIntegrations?: IntegrationKind[];
  options: WidgetOptionsRecord;
  errors?: Partial<
    Record<
      DefaultErrorData["code"],
      {
        icon: TablerIcon;
        message: stringOrTranslation;
      }
    >
  >;
}

export interface WidgetProps<TKind extends WidgetKind> {
  options: inferOptionsFromDefinition<WidgetOptionsRecordOf<TKind>>;
  integrationIds: string[];
  itemId: string | undefined; // undefined when in preview mode
}

type inferServerDataForKind<TKind extends WidgetKind> = WidgetImports[TKind] extends {
  serverDataLoader: ServerDataLoader<TKind>;
}
  ? Awaited<ReturnType<Awaited<ReturnType<WidgetImports[TKind]["serverDataLoader"]>>["default"]>>
  : undefined;

export type WidgetComponentProps<TKind extends WidgetKind> = WidgetProps<TKind> & {
  serverData?: inferServerDataForKind<TKind>;
} & {
  boardId: string | undefined; // undefined when in preview mode
  isEditMode: boolean;
  width: number;
  height: number;
};

export type WidgetOptionsRecordOf<TKind extends WidgetKind> = WidgetImports[TKind]["definition"]["options"];
