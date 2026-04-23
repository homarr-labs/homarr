import { optionsBuilder } from "../options";

export const serverDefinition = {
  supportedIntegrations: ["coolify"] as const,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showServers: factory.switch({ defaultValue: true }),
      showApplications: factory.switch({ defaultValue: true }),
      showServices: factory.switch({ defaultValue: true }),
    }));
  },
};
