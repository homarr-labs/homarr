import { IconHourglass } from "@tabler/icons-react";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { getTimeZoneOptions } from "../clock/world-clock";

const maximumCountdownEvents = 20;

export const definition = {
  kind: "countdown",
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
} satisfies WidgetDefinition & { kind: "countdown" };
