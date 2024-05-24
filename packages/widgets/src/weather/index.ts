import { IconCloud } from "@tabler/icons-react";

import { z } from "@homarr/validation";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("weather", {
  icon: IconCloud,
  options: optionsBuilder.from(
    (factory) => ({
      isFormatFahrenheit: factory.switch(),
      location: factory.location({
        defaultValue: {
          name: "Paris",
          latitude: 48.85341,
          longitude: 2.3488,
        },
      }),
      showCity: factory.switch(),
      hasForecast: factory.switch(),
      forecastDayCount: factory.slider({
        defaultValue: 5,
        validate: z.number().min(1).max(7),
        step: 1,
        withDescription: true,
      }),
    }),
    {
      forecastDayCount: {
        shouldHide({ hasForecast }) {
          return !hasForecast;
        },
      },
    },
  ),
}).withDynamicImport(() => import("./component"));
