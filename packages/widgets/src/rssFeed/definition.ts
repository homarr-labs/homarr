import { z } from "zod/v4";

import { optionsBuilder } from "../options";

export const serverDefinition = {
  createOptions() {
    return optionsBuilder.from((factory) => ({
      feedUrls: factory.multiText({ defaultValue: [], validate: z.string().url() }),
      enableRtl: factory.switch({ defaultValue: false }),
      textLinesClamp: factory.number({ defaultValue: 5, validate: z.number().min(1).max(50) }),
      maximumAmountPosts: factory.number({ defaultValue: 100, validate: z.number().min(1).max(9999) }),
      hideDescription: factory.switch({ defaultValue: false }),
      showPosterImage: factory.switch({ defaultValue: false }),
    }));
  },
};
