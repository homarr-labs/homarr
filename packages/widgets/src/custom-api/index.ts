import { IconApi } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("customApi", {
  icon: IconApi,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      definitionId: factory.customWidgetSelect({ defaultValue: "" }),
    }));
  },
}).withDynamicImport(() => import("./component"));
