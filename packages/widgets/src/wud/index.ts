import { IconBrandDocker } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("wud", {
  icon: IconBrandDocker,
  supportedIntegrations: ["wud"],
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showTitle: factory.switch({ defaultValue: true }),
      layout: factory.select({
        options: (["horizontal", "vertical"] as const).map((value) => ({
          value,
          label: (t) => t(`widget.wud.option.layout.option.${value}.label`),
        })),
        defaultValue: "horizontal",
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
