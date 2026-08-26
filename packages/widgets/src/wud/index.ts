import { IconBrandDocker } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("wud", {
  icon: IconBrandDocker,
  supportsAdvancedFocus: true,
  refetchInterval: null,
  supportedIntegrations: ["wud", "mock"],
  integrationsRequired: true,
  maxIntegrations: 1,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showTitle: factory.switch({ defaultValue: true }),
      showRing: factory.switch({ defaultValue: true }),
      layout: factory.select({
        options: (["horizontal", "vertical"] as const).map((value) => ({
          value,
          label: (t) => t(`widget.common.layout.option.${value}`),
        })),
        defaultValue: "horizontal",
      }),
      showUpdateList: factory.switch({ defaultValue: false, withDescription: true }),
    }));
  },
}).withDynamicImport(() => import("./component"));
