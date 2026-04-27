import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { optionsBuilder } from "../options";

export const serverDefinition = {
  supportedIntegrations: getIntegrationKindsByCategory("firewall"),
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
};
