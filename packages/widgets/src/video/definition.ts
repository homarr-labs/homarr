import { optionsBuilder } from "../options";

export const serverDefinition = {
  createOptions() {
    return optionsBuilder.from((factory) => ({
      feedUrl: factory.text({ defaultValue: "" }),
      hasAutoPlay: factory.switch({ withDescription: true }),
      isMuted: factory.switch({ defaultValue: true }),
      hasControls: factory.switch(),
    }));
  },
};
