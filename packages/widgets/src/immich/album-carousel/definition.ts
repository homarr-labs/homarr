import { z } from "zod/v4";

import { optionsBuilder } from "../../options";

export const serverDefinition = {
  supportedIntegrations: ["immich"] as const,
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      albumId: factory.text({ defaultValue: "", withDescription: true }),
      rotationIntervalSeconds: factory.number({
        defaultValue: 5,
        validate: z.number().min(1).max(3600),
        withDescription: true,
      }),
      showPhotoInfo: factory.switch({ defaultValue: false, withDescription: true }),
    }));
  },
};
