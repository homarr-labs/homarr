import { IconServer } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "../../../definitions/src/integration";
import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("systemUsage", {
  icon: IconServer,
  supportedIntegrations: getIntegrationKindsByCategory("systemUsage"),
  integrationsRequired: false,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      // TODO: add autocomplete with getSystems call from router
      systemId: factory.select({
        options: ["xyjcti2b4ocz3j3"],
      }),
      visibleItems: factory.multiSelect({
        options: (["cpu", "memory", "disk", "gpu", "load", "network", "temperature", "agent"] as const).map((key) => ({
          value: key,
          label: (t) => t(`widget.systemUsage.item.${key}.label`),
        })),
        defaultValue: ["cpu", "memory", "disk", "gpu", "load", "network", "temperature", "agent"],
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
