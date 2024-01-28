import type { LoaderComponent } from "next/dynamic";

import type { WidgetKind } from "@homarr/definitions";
import type { TablerIconsProps } from "@homarr/ui";

import type { WidgetImports } from ".";
import type {
  inferOptionsFromDefinition,
  WidgetOptionsRecord,
} from "./options";

export const createWidgetDefinition = <
  TKind extends WidgetKind,
  TDefinition extends Definition,
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

interface Definition {
  icon: (props: TablerIconsProps) => JSX.Element;
  options: WidgetOptionsRecord;
}

export interface WidgetComponentProps<TKind extends WidgetKind> {
  options: inferOptionsFromDefinition<WidgetOptionsRecordOf<TKind>>;
  integrations: unknown[];
}

export type WidgetOptionsRecordOf<TKind extends WidgetKind> =
  WidgetImports[TKind]["definition"]["options"];
