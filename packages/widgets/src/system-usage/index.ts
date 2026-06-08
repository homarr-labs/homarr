import { IconServer } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("systemUsage", {
  icon: IconServer,
  supportedIntegrations: getIntegrationKindsByCategory("systemUsage"),
  integrationsRequired: false,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      systemId: factory.dynamicSelect({
        useOptions(_query, integrationIds) {
          const { data: systems, isPending } = clientApi.widget.systemUsage.listSystems.useQuery(
            { integrationId: integrationIds[0] ?? "" },
            {
              enabled: integrationIds.length > 0,
            },
          );

          return {
            isPending,
            options:
              systems?.map((system) => ({
                label: system.name,
                value: system.id,
              })) ?? [],
          };
        },
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
