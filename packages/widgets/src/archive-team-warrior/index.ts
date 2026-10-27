import { IconArchive } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { widgetQuery } from "../data";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("archiveTeamWarrior", {
  icon: IconArchive,
  supportsAdvancedFocus: true,
  ...getWidgetIntegrationConfig("archiveTeamWarrior"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showBroadcastMessage: factory.switch({
        defaultValue: true,
      }),
    }));
  },
})
  .withData({
    mode: "queries",
    requiresData: true,
    queries: ({ integrationIds }) => ({
      main: widgetQuery("widget.archiveTeamWarrior.getStatus", { integrationId: integrationIds[0] ?? "" }),
    }),
  })
  .withDynamicImport(() => import("./component"));
