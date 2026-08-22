import { IconCloud } from "@tabler/icons-react";
import dayjs from "dayjs";
import { z } from "zod/v4";

import { createWidgetDefinition, widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("weather", {
  icon: IconCloud,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "weather", "atLocation"]],
  refetchInterval: 600,
  queryMatcher: ({ input }, scope) => {
    const location = scope.options.location;
    if (location === null || typeof location !== "object" || !("latitude" in location) || !("longitude" in location)) {
      return false;
    }
    return widgetQueryInputMatches(input, {
      latitude: location.latitude,
      longitude: location.longitude,
    });
  },
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        isFormatFahrenheit: factory.switch(),
        disableTemperatureDecimals: factory.switch(),
        animateIcons: factory.switch(),
        showHumidity: factory.switch({ defaultValue: false }),
        showCurrentWindSpeed: factory.switch(),
        useImperialSpeed: factory.switch(),
        location: factory.location({
          defaultValue: {
            name: "Paris",
            latitude: 48.85341,
            longitude: 2.3488,
          },
        }),
        dateFormat: factory.select({
          options: [
            { value: "dddd, MMMM D", label: dayjs().format("dddd, MMMM D") },
            { value: "dddd, D MMMM", label: dayjs().format("dddd, D MMMM") },
            { value: "MMM D", label: dayjs().format("MMM D") },
            { value: "D MMM", label: dayjs().format("D MMM") },
            { value: "DD/MM/YYYY", label: dayjs().format("DD/MM/YYYY") },
            { value: "MM/DD/YYYY", label: dayjs().format("MM/DD/YYYY") },
            { value: "DD/MM", label: dayjs().format("DD/MM") },
            { value: "MM/DD", label: dayjs().format("MM/DD") },
          ],
          defaultValue: "dddd, MMMM D",
          withDescription: true,
        }),
        showCity: factory.switch({ defaultValue: false }),
        hasForecast: factory.switch({ defaultValue: false }),
        forecastDayCount: factory.slider({
          defaultValue: 3,
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
    );
  },
}).withDynamicImport(() => import("./component"));
