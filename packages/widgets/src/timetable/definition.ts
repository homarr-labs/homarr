import { optionsBuilder } from "../options";

export const serverDefinition = {
  supportedIntegrations: ["searchCh"] as const,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      station: factory.dynamicSelect({
        useOptions: () => ({ isPending: false, options: [] }),
      }),
    }));
  },
};
