import { IconBusStop } from "@tabler/icons-react";
import { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("timetable", {
  icon: IconBusStop,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      baseUrl: factory.text({
        defaultValue: "https://search.ch",
        validate: z.string().url(),
      }),
      station: factory.dynamicSelect({
        useOptions(query, _integrationIds, options) {
          const { data: stations, isPending } = clientApi.widget.timetable.searchStations.useQuery({
            baseUrl: typeof options.baseUrl === "string" ? options.baseUrl : "https://search.ch",
            query,
          });

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
