import { IconCalendar } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { z } from "@homarr/validation";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader, serverDataLoader } = createWidgetDefinition("calendar", {
  icon: IconCalendar,
  options: optionsBuilder.from((factory) => ({
    releaseType: factory.multiSelect({
      defaultValue: ["Cinemas", "Digital"],
      options: ["Cinemas", "Digital", "Physical"],
    }),
    filterPastMonths: factory.number({
      validate: z.number().min(2).max(9999),
      defaultValue: 2,
    }),
    filterFutureMonths: factory.number({
      validate: z.number().min(2).max(9999),
      defaultValue: 2,
    }),
  })),
  supportedIntegrations: getIntegrationKindsByCategory("calendar"),
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));
