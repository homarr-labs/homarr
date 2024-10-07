import { IconCalendar } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { z } from "@homarr/validation";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("calendar", {
  icon: IconCalendar,
  options: optionsBuilder.from((factory) => ({
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
}).withDynamicImport(() => import("./component"));
