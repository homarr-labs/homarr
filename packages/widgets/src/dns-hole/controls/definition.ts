import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { optionsBuilder } from "../../options";

export const serverDefinition = {
  supportedIntegrations: getIntegrationKindsByCategory("dnsHole"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showToggleAllButtons: factory.switch({ defaultValue: true }),
    }));
  },
};
