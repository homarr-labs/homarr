import { IconGraphFilled } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("systemResources", {
  icon: IconGraphFilled,
  supportedIntegrations: ["dashDot", "openmediavault", "truenas"],
  createOptions() {
    return optionsBuilder.from((factory) => ({
      visibleCharts: factory.multiSelect({
        options: (["cpu", "memory", "network"] as const).map((key) => ({
          value: key,
          label: (t) => t(`widget.systemResources.option.visibleCharts.option.${key}`),
        })),
        defaultValue: ["cpu", "memory", "network"],
        withDescription: true,
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
