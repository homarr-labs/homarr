import { IconWind } from "@tabler/icons-react";

import { createWidgetDefinition, widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("airQuality", {
  icon: IconWind,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "airQuality", "atLocation"]],
  refetchInterval: 900,
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
    return optionsBuilder.from((factory) => ({
      location: factory.location({
        defaultValue: {
          name: "Paris",
          latitude: 48.85341,
          longitude: 2.3488,
        },
      }),
      aqiStandard: factory.select({
        defaultValue: "auto",
        options: [
          { value: "auto", label: (t) => t("widget.airQuality.option.aqiStandard.options.auto") },
          { value: "european", label: (t) => t("widget.airQuality.option.aqiStandard.options.european") },
          { value: "us", label: (t) => t("widget.airQuality.option.aqiStandard.options.us") },
        ],
      }),
      showUv: factory.switch({ defaultValue: true }),
      showPollutants: factory.switch({ defaultValue: true }),
      showPollen: factory.switch({ defaultValue: true }),
    }));
  },
}).withDynamicImport(() => import("./component"));
