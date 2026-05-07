import { IconBusStop } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("timetable", {
  icon: IconBusStop,
  supportedIntegrations: ["searchCh"],
  createOptions() {
    return optionsBuilder.from((factory) => ({
      station: factory.dynamicSelect({
        useOptions(query, integrationIds) {
          const { data: stations, isPending } = clientApi.widget.timetable.searchStations.useQuery(
            {
              integrationId: integrationIds[0] ?? "",
              query,
            },
            {
              enabled: integrationIds.length > 0,
            },
          );

          return {
            isPending,
            options:
              stations?.map((station) => ({
                label: station.name,
                value: station.id,
              })) ?? [],
          };
        },
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));
