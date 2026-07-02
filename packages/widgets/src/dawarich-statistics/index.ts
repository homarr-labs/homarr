import { IconChartBar } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("dawarichStatistics", {
  icon: IconChartBar,
  supportedIntegrations: ["dawarich"],
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showTotalDistance: factory.switch({ defaultValue: true }),
      showTotalPoints: factory.switch({ defaultValue: true }),
      showReverseGeocoded: factory.switch({ defaultValue: true }),
      showCountries: factory.switch({ defaultValue: true }),
      showCities: factory.switch({ defaultValue: true }),
    }));
  },
}).withDynamicImport(() => import("./component"));
