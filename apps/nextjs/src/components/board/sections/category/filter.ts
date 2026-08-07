import type { WidgetKind } from "@homarr/definitions";
import type { SettingsContextProps } from "@homarr/settings/creator";
import type { WidgetComponentProps } from "@homarr/widgets/definition";
import { loadWidgetDefinition, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";

import type { Item } from "~/app/[locale]/boards/_types";

export const filterByItemKind = async <TKind extends WidgetKind>(
  items: Item[],
  settings: SettingsContextProps,
  kind: TKind,
) => {
  const definition = await loadWidgetDefinition(kind);

  return items
    .filter((item) => item.kind === kind)
    .map((item) => ({
      ...item,
      options: reduceWidgetOptionsWithDefinition(
        definition,
        settings,
        item.options,
      ) as WidgetComponentProps<TKind>["options"],
    }));
};
