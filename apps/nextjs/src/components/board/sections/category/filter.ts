import type { WidgetKind } from "@homarr/definitions";
import type { WidgetComponentProps } from "@homarr/widgets";
import { reduceWidgetOptionsWithDefaultValues } from "@homarr/widgets";
import type { Item } from "~/app/[locale]/boards/_types";

export const filterByItemKind = <TKind extends WidgetKind>(items: Item[], kind: TKind) => {
  return items
    .filter((item) => item.kind === kind)
    .map((item) => ({
      ...item,
      options: reduceWidgetOptionsWithDefaultValues(kind, item.options) as WidgetComponentProps<TKind>["options"],
    }));
};
