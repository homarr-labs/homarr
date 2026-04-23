import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { optionsBuilder } from "../options";

export const serverDefinition = {
  supportedIntegrations: getIntegrationKindsByCategory("notifications"),
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
};
