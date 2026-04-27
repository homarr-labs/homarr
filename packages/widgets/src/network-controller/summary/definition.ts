import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { optionsBuilder } from "../../options";

export const serverDefinition = {
  supportedIntegrations: getIntegrationKindsByCategory("networkController"),
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
};
