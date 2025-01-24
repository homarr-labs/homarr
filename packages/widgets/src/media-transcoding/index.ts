import { IconTransform } from "@tabler/icons-react";

import { z } from "@homarr/validation";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("mediaTranscoding", {
  icon: IconTransform,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      defaultView: factory.select({
        defaultValue: "statistics",
        options: [
          { label: "Workers", value: "workers" },
          { label: "Queue", value: "queue" },
          { label: "Statistics", value: "statistics" },
        ],
      }),
      queuePageSize: factory.number({ defaultValue: 10, validate: z.number().min(1).max(30) }),
    }));
  },
  supportedIntegrations: ["tdarr"],
}).withDynamicImport(() => import("./component"));
