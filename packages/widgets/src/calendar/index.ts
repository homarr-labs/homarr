import { IconCalendar } from "@tabler/icons-react";

import { z } from "@homarr/validation";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader, serverDataLoader } = createWidgetDefinition("calendar", {
  icon: IconCalendar,
  options: optionsBuilder.from((factory) => ({
    filterPastMonths: factory.number({
      validate: z.number().min(2).max(9999),
      defaultValue: 2
    }),
    filterFutureMonths: factory.number({
      validate: z.number().min(2).max(9999),
      defaultValue: 2
    }),
  })),
  supportedIntegrations: ["sonarr", "radarr", "lidarr", "readarr"],
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));
