import { IconNotes } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { widgetQuery } from "../data";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("anchorNote", {
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
})
  .withData({
    mode: "queries",
    queries: ({ integrationIds, options }) => ({
      main: widgetQuery(
        "widget.anchorNotes.getNote",
        { integrationId: integrationIds[0] ?? "", noteId: options.noteId.trim() },
        { enabled: Boolean(options.noteId.trim()) },
      ),
    }),
  })
  .withDynamicImport(() => import("./component"));
