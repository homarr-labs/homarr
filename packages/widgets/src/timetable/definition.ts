import { IconBusStop, IconWorldOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import type { NativeWidgetInputs, NativeWidgetOutputs } from "@homarr/api/nitro/browser-contracts/widgets";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export interface DefinitionResources {
  useStationSearch: (input: NativeWidgetInputs["timetable"]["searchStations"]) => {
    data: NativeWidgetOutputs["timetable"]["searchStations"] | undefined;
    error: unknown;
    isPending: boolean;
  };
  useTimetableTranslations: () => (key: "error.stationSearch") => string;
}

export const createDefinition = (resources: DefinitionResources) =>
  ({
    kind: "timetable",
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
            const t = resources.useTimetableTranslations();
            const {
              data: stations,
              error,
              isPending,
            } = resources.useStationSearch({
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
  }) satisfies WidgetDefinition & { kind: "timetable" };
