import { optionsBuilder } from "../options";

export const serverDefinition = {
  supportedIntegrations: ["tracearr"] as const,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showStreams: factory.switch({ defaultValue: true }),
      showStats: factory.switch({ defaultValue: true }),
      showRecentActivity: factory.switch({ defaultValue: true }),
      showViolations: factory.switch({ defaultValue: true }),
    }));
  },
};
