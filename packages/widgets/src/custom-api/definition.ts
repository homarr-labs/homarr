import { IconApi } from "@tabler/icons-react";
import { z } from "zod/v4";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const definition = {
  kind: "customApi",
  icon: IconApi,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      definitionId: factory.customWidgetSelect({ defaultValue: "" }),
      configuration: factory.customWidgetConfiguration(),
      configurationVersion: factory.internal({ defaultValue: 1 }),
      refreshInterval: factory.slider({
        defaultValue: 30,
        validate: z.number().min(1).max(3600),
        step: 1,
        withDescription: true,
      }),
    }));
  },
} satisfies WidgetDefinition & { kind: "customApi" };
