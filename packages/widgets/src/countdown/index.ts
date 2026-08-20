import { IconHourglass } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { getTimeZoneOptions } from "../clock/world-clock";

const maximumCountdownEvents = 20;

export const { definition, componentLoader } = createWidgetDefinition("countdown", {
  icon: IconHourglass,
  supportsAdvancedFocus: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      events: factory.dateTimeEventList({
        defaultValue: [],
        maxValues: maximumCountdownEvents,
        timeZoneOptions: getTimeZoneOptions(),
        withDescription: true,
      }),
      showProgress: factory.switch({ defaultValue: true }),
      showSeconds: factory.switch({ defaultValue: false, withDescription: true }),
    }));
  },
}).withDynamicImport(() => import("./component"));
