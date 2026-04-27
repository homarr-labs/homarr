import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { optionsBuilder } from "../../options";

export const serverDefinition = {
  supportedIntegrations: getIntegrationKindsByCategory("smartHomeServer"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      displayName: factory.text(),
      automationId: factory.text(),
    }));
  },
};
