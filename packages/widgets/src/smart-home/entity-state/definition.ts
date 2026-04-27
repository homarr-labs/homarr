import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { optionsBuilder } from "../../options";

export const serverDefinition = {
  supportedIntegrations: getIntegrationKindsByCategory("smartHomeServer"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      entityId: factory.text({ defaultValue: "sun.sun" }),
      displayName: factory.text({ defaultValue: "Sun" }),
      entityUnit: factory.text(),
      clickable: factory.switch(),
    }));
  },
};
