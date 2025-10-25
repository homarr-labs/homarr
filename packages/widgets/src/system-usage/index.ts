import { IconServer } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";

import { getIntegrationKindsByCategory } from "../../../definitions/src/integration";
import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("systemUsage", {
  icon: IconServer,
  supportedIntegrations: getIntegrationKindsByCategory("systemUsage"),
  integrationsRequired: false,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      systemId: factory.dynamicSelect({
        useOptions(query, integrationIds) {
          return clientApi.widget.systemUsage.listSystems.useQuery(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            { integrationId: integrationIds[0]! },
            {
              enabled: integrationIds.length > 0,
              select(data) {
                return data.map((system) => ({
                  value: system.id,
                  label: system.name,
                }));
              },
            },
          );
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
