import { z } from "zod/v4";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { radarrReleaseTypes } from "@homarr/integrations/types";

import { optionsBuilder } from "../options";

export const serverDefinition = {
  supportedIntegrations: getIntegrationKindsByCategory("calendar"),
  integrationsRequired: false,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      releaseType: factory.multiSelect({
        defaultValue: ["inCinemas", "digitalRelease"],
        options: radarrReleaseTypes.map((value) => ({
          value,
          label: (t: (s: string) => string) => t(`widget.calendar.option.releaseType.options.${value}`),
        })),
      }),
      filterPastMonths: factory.number({ validate: z.number().min(2).max(9999), defaultValue: 2 }),
      filterFutureMonths: factory.number({ validate: z.number().min(2).max(9999), defaultValue: 2 }),
      showUnmonitored: factory.switch({ defaultValue: false }),
    }));
  },
};
