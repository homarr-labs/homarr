import { getIntegrationKindsByCategory } from "@homarr/definitions";

export const serverDefinition = {
  supportedIntegrations: getIntegrationKindsByCategory("mediaRequest"),
  createOptions() {
    return {};
  },
};
