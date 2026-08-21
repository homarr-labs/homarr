import { IconBrandDocker, IconServerOff } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { invariantTechnicalLabels } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

const columnsList = [
  "name",
  "state",
  "cpuUsage",
  "memoryUsage",
] as const satisfies (keyof RouterOutputs["docker"]["getContainers"]["containers"][number])[];

const allColumnsList = ["name", "state", "host", "cpuUsage", "memoryUsage", "actions"] as const;

const columnTranslationKeyMap = {
  name: "common.field.name",
  state: "docker.field.state.label",
  host: "docker.field.host.label",
  memoryUsage: "docker.field.stats.memory.label",
  actions: "docker.action.title",
} as const satisfies Record<Exclude<(typeof allColumnsList)[number], "cpuUsage">, string>;

export const { definition, componentLoader } = createWidgetDefinition("dockerContainers", {
  icon: IconBrandDocker,
  supportsAdvancedFocus: true,
  queryKey: [["docker", "getContainers"]],
  refetchInterval: 30,
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        endpointIds: factory.dynamicMultiSelect({
          defaultValue: [],
          maxValues: 100,
          withDescription: true,
          useOptions: () => {
            const { data = [], isPending, isError } = clientApi.docker.getEndpoints.useQuery();
            return {
              data: data.map((endpoint) => ({ value: endpoint.id, label: endpoint.name })),
              isPending,
              isError,
            };
          },
        }),
        columns: factory.multiSelect({
          defaultValue: [...allColumnsList],
          options: allColumnsList.map((value) => ({
            value,
            label: (t) => {
              if (value === "cpuUsage") return invariantTechnicalLabels.cpu;
              return t(columnTranslationKeyMap[value]);
            },
          })),
          searchable: true,
        }),
        enableRowSorting: factory.switch({
          defaultValue: false,
        }),
        defaultSort: factory.select({
          defaultValue: "name",
          options: columnsList.map((value) => ({
            value,
            label: (t) => t(`widget.dockerContainers.option.defaultSort.option.${value}`),
          })),
        }),
        descendingDefaultSort: factory.switch({
          defaultValue: false,
        }),
        columnOrder: factory.text({ defaultValue: "" }),
        columnWidths: factory.text({ defaultValue: "" }),
      }),
      {
        columnOrder: { shouldHide: () => true },
        columnWidths: { shouldHide: () => true },
      },
    );
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.dockerContainers.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
