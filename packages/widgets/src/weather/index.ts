import { IconCloud } from "@homarr/ui";

import { createWidgetDefinition } from "../definition";
import { opt } from "../options";

export const { definition, componentLoader } = createWidgetDefinition(
  "weather",
  {
    icon: IconCloud,
    options: opt.from((fac) => ({
      location: fac.location(),
      showCity: fac.switch(),
    })),
  },
).withDynamicImport(() => import("./component"));
