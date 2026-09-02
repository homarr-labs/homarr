import { IconCpu } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("llamacpp", {
  icon: IconCpu,
  refetchInterval: 5,
  supportedIntegrations: ["llamacpp"],
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showTitle: factory.switch({ defaultValue: true }),
      showModelInfo: factory.switch({ defaultValue: true }),
      showContextUsage: factory.switch({ defaultValue: true }),
      showCacheHitRate: factory.switch({ defaultValue: true }),
    }));
  },
}).withDynamicImport(() => import("./component"));
