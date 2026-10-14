import { IconNotes } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const definition = {
  kind: "anchorNote",
  icon: IconNotes,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "anchorNotes"]],
  ...getWidgetIntegrationConfig("anchorNote"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      noteId: factory.anchorNote(),
      showTitle: factory.switch({
        defaultValue: true,
      }),
      showUpdatedAt: factory.switch({
        defaultValue: true,
      }),
    }));
  },
} satisfies WidgetDefinition & { kind: "anchorNote" };
