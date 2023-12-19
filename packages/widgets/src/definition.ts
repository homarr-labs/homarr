import type { LoaderComponent } from "next/dynamic";

import type { TablerIconsProps } from "@homarr/ui";

import type { WidgetImports, WidgetSort } from ".";
import type {
  inferOptionsFromDefinition,
  WidgetOptionsRecord,
} from "./options";

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
  options: WidgetOptionsRecord;
}

export interface WidgetComponentProps<TSort extends WidgetSort> {
  options: inferOptionsFromDefinition<WidgetOptionsRecordOf<TSort>>;
  integrations: unknown[];
}

export type WidgetOptionsRecordOf<TSort extends WidgetSort> =
  WidgetImports[TSort]["definition"]["options"];
