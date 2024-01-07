import type { LoaderComponent } from "next/dynamic";

import type { IntegrationKind } from "@homarr/definitions";
import type { TablerIconsProps } from "@homarr/ui";

import type { WidgetImports, WidgetSort } from ".";
import type {
  inferOptionsFromDefinition,
  WidgetOptionsRecord,
} from "./options";
import type { IntegrationSelectOption } from "./widget-integration-select";

export const createWidgetDefinition = <
  TSort extends WidgetSort,
  TDefinition extends Definition,
>(
  sort: TSort,
  definition: TDefinition,
) => ({
  withDynamicImport: (
    componentLoader: () => LoaderComponent<WidgetComponentProps<TSort>>,
  ) => ({
    definition: {
      sort,
      ...definition,
    },
    componentLoader,
  }),
});

interface Definition {
  icon: (props: TablerIconsProps) => JSX.Element;
  supportedIntegrations?: IntegrationKind[];
  options: WidgetOptionsRecord;
}

export interface WidgetComponentProps<TSort extends WidgetSort> {
  options: inferOptionsFromDefinition<WidgetOptionsRecordOf<TSort>>;
  integrations: WidgetImports[TSort]["definition"] extends {
    supportedIntegrations: infer TSupportedIntegrations;
  }
    ? TSupportedIntegrations extends IntegrationKind[]
      ? {
          id: string;
          name: string;
          url: string;
          kind: TSupportedIntegrations[number];
        }[]
      : IntegrationSelectOption[]
    : IntegrationSelectOption[];
}

export type WidgetOptionsRecordOf<TSort extends WidgetSort> =
  WidgetImports[TSort]["definition"]["options"];
