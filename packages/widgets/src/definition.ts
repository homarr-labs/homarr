import type { LoaderComponent } from "next/dynamic";

import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import type { TablerIcon } from "@homarr/ui";

import type { WidgetImports } from ".";
import type {
  inferOptionsFromDefinition,
  WidgetOptionsRecord,
} from "./options";
import type { IntegrationSelectOption } from "./widget-integration-select";

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
              serverData: Awaited<
                ReturnType<Awaited<ReturnType<TServerDataLoader>>["default"]>
              >;
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
  <TKind extends WidgetKind, TDefinition extends WidgetDefinition>(
    kind: TKind,
    definition: TDefinition,
  ) =>
  <TServerDataLoader extends ServerDataLoader<TKind>>(
    serverDataLoader: TServerDataLoader,
  ) => ({
    definition: {
      ...definition,
      kind,
    },
    kind,
    serverDataLoader,
    withDynamicImport: createWithDynamicImport(
      kind,
      definition,
      serverDataLoader,
    ),
  });

export const createWidgetDefinition = <
  TKind extends WidgetKind,
  TDefinition extends WidgetDefinition,
>(
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
}

export interface WidgetProps<TKind extends WidgetKind> {
  options: inferOptionsFromDefinition<WidgetOptionsRecordOf<TKind>>;
  integrations: inferIntegrationsFromDefinition<
    WidgetImports[TKind]["definition"]
  >;
}

type inferServerDataForKind<TKind extends WidgetKind> =
  WidgetImports[TKind] extends { serverDataLoader: ServerDataLoader<TKind> }
    ? Awaited<
        ReturnType<
          Awaited<
            ReturnType<WidgetImports[TKind]["serverDataLoader"]>
          >["default"]
        >
      >
    : undefined;

export type WidgetComponentProps<TKind extends WidgetKind> =
  WidgetProps<TKind> & {
    serverData?: inferServerDataForKind<TKind>;
  } & {
    itemId: string | undefined; // undefined when in preview mode
    boardId: string | undefined; // undefined when in preview mode
    isEditMode: boolean;
    width: number;
    height: number;
  };

type inferIntegrationsFromDefinition<TDefinition extends WidgetDefinition> =
  TDefinition extends {
    supportedIntegrations: infer TSupportedIntegrations;
  } // check if definition has supportedIntegrations
    ? TSupportedIntegrations extends IntegrationKind[] // check if supportedIntegrations is an array of IntegrationKind
      ? IntegrationSelectOptionFor<TSupportedIntegrations[number]>[] // if so, return an array of IntegrationSelectOptionFor
      : IntegrationSelectOption[] // otherwise, return an array of IntegrationSelectOption without specifying the kind
    : IntegrationSelectOption[];

interface IntegrationSelectOptionFor<TIntegration extends IntegrationKind> {
  id: string;
  name: string;
  url: string;
  kind: TIntegration[number];
}

export type WidgetOptionsRecordOf<TKind extends WidgetKind> =
  WidgetImports[TKind]["definition"]["options"];
