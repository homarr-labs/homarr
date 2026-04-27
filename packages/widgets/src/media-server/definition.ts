import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { optionsBuilder } from "../options";

export const serverDefinition = {
  supportedIntegrations: getIntegrationKindsByCategory("mediaService"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showOnlyPlaying: factory.switch({ defaultValue: true, withDescription: true }),
    }));
  },
};
