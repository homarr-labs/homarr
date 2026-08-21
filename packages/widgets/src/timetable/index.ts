import { IconBusStop, IconWorldOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { componentLoader, definition } = createWidgetDefinition("timetable", {
  icon: IconBusStop,
  supportsAdvancedFocus: true,
  errors: {
    BAD_REQUEST: {
      icon: IconWorldOff,
      message: (t) => t("widget.timetable.error.customSourceUnavailable"),
      hideLogsLink: true,
    },
  },
  createOptions() {
    return optionsBuilder.from((factory) => ({
      baseUrl: factory.text({
        defaultValue: "https://search.ch",
        validate: z.string().url(),
        withDescription: true,
      }),
      station: factory.dynamicSelect({
        useOptions(query, _integrationIds, options, itemId, boardId) {
          const t = useI18n("widget.timetable");
          const {
            data: stations,
            error,
            isPending,
          } = clientApi.widget.timetable.searchStations.useQuery({
            baseUrl: typeof options.baseUrl === "string" ? options.baseUrl : "https://search.ch",
            itemId,
            boardId,
            query,
          });

          return {
            error: error ? t("error.stationSearch") : undefined,
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
