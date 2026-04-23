import { z } from "zod/v4";

import { optionsBuilder } from "../../options";

export const serverDefinition = {
  createOptions() {
    return optionsBuilder.from((factory) => ({
      title: factory.text({ defaultValue: "" }),
      domain: factory.text({ defaultValue: "hypixel.net", validate: z.string().nonempty() }),
      isBedrockServer: factory.switch({ defaultValue: false }),
    }));
  },
};
