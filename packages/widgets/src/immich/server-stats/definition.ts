import { optionsBuilder } from "../../options";

export const serverDefinition = {
  supportedIntegrations: ["immich"] as const,
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showUsers: factory.switch({ defaultValue: true, withDescription: true }),
      showPhotos: factory.switch({ defaultValue: true, withDescription: true }),
      showVideos: factory.switch({ defaultValue: true, withDescription: true }),
      showStorage: factory.switch({ defaultValue: true, withDescription: true }),
    }));
  },
};
