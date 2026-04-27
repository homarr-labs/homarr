import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { optionsBuilder } from "../../options";

export const serverDefinition = {
  supportedIntegrations: getIntegrationKindsByCategory("mediaRequest"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      linksTargetNewTab: factory.switch({ defaultValue: true }),
    }));
  },
};
