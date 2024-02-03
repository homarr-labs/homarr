import type { LoaderComponent } from "next/dynamic";

import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import type { TablerIconsProps } from "@homarr/ui";

import type { WidgetImports } from ".";
import type {
  inferOptionsFromDefinition,
  WidgetOptionsRecord,
} from "./options";
import type { IntegrationSelectOption } from "./widget-integration-select";

export const createWidgetDefinition = <
  TKind extends WidgetKind,
  TDefinition extends WidgetDefinition,
>(
  kind: TKind,
  definition: TDefinition,
) => ({
  withDynamicImport: (
    componentLoader: () => LoaderComponent<WidgetComponentProps<TKind>>,
  ) => ({
    definition: {
      kind,
      ...definition,
    },
    componentLoader,
  }),
});

export interface WidgetDefinition {
  icon: (props: TablerIconsProps) => JSX.Element;
  supportedIntegrations?: IntegrationKind[];
  options: WidgetOptionsRecord;
}

export interface WidgetComponentProps<TKind extends WidgetKind> {
  options: inferOptionsFromDefinition<WidgetOptionsRecordOf<TKind>>;
  integrations: inferIntegrationsFromDefinition<
    WidgetImports[TKind]["definition"]
  >;
}

type inferIntegrationsFromDefinition<TDefinition extends Definition> =
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
