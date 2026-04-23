import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { optionsBuilder } from "../options";

export const serverDefinition = {
  supportedIntegrations: getIntegrationKindsByCategory("indexerManager"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      openIndexerSiteInNewTab: factory.switch({ defaultValue: true }),
    }));
  },
};
