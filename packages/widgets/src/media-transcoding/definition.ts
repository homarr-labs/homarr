import { z } from "zod/v4";

import { capitalize } from "@homarr/common";
import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { optionsBuilder } from "../options";

export const views = ["workers", "queue", "statistics"] as const;

export const serverDefinition = {
  supportedIntegrations: getIntegrationKindsByCategory("mediaTranscoding"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      defaultView: factory.select({
        defaultValue: "statistics" as const,
        options: views.map((view) => ({ label: capitalize(view), value: view })),
      }),
      queuePageSize: factory.number({ defaultValue: 10, validate: z.number().min(1).max(30) }),
    }));
  },
};
