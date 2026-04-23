import { optionsBuilder } from "../options";

export const serverDefinition = {
  supportedIntegrations: ["anchor"] as const,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      noteId: factory.anchorNote(),
      showTitle: factory.switch({ defaultValue: true }),
      showUpdatedAt: factory.switch({ defaultValue: true }),
    }));
  },
};
