import { optionsBuilder } from "../options";

export const serverDefinition = {
  supportedIntegrations: ["speedtestTracker"] as const,
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        showLatestResult: factory.switch({ defaultValue: true }),
        showStats: factory.switch({ defaultValue: true }),
        showRecentResults: factory.switch({ defaultValue: true }),
        showPingGraph: factory.switch({ defaultValue: true }),
      }),
      {
        showPingGraph: { shouldHide: (options) => !options.showRecentResults },
      },
    );
  },
};
