import { IconCloud } from "@homarr/ui";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition(
  "weather",
  {
    icon: IconCloud,
    options: optionsBuilder.from((factory) => ({
      location: factory.location(),
      showCity: factory.switch(),
    })),
  },
).withDynamicImport(() => import("./component"));
