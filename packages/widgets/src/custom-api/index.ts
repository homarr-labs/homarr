import { IconApi } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("customApi", {
  icon: IconApi,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      definitionId: factory.customWidgetSelect({ defaultValue: "" }),
      refreshInterval: factory.slider({
        defaultValue: 30,
        validate: z.number().min(1).max(3600),
        step: 1,
        withDescription: true,
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
