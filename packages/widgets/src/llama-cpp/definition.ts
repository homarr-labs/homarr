import { IconCpu } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const definition = {
  kind: "llamacpp",
  icon: IconCpu,
  refetchInterval: 5,
  supportsAdvancedFocus: true,
  ...getWidgetIntegrationConfig("llamacpp"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showModelInfo: factory.switch({ defaultValue: true }),
      showContextUsage: factory.switch({ defaultValue: true }),
      showCacheHitRate: factory.switch({ defaultValue: true }),
      showSpeedStats: factory.switch({ defaultValue: true }),
      showRequests: factory.switch({ defaultValue: true }),
      showTokenStats: factory.switch({ defaultValue: true }),
      showSpeculative: factory.switch({ defaultValue: true }),
    }));
  },
} satisfies WidgetDefinition & { kind: "llamacpp" };
