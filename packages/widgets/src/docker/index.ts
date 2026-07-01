import { IconBrandDocker, IconServerOff } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";

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
  name: "docker.field.name.label",
  state: "docker.field.state.label",
  host: "docker.field.host.label",
  cpuUsage: "docker.field.stats.cpu.label",
  memoryUsage: "docker.field.stats.memory.label",
  actions: "docker.action.title",
} as const satisfies Record<(typeof allColumnsList)[number], string>;

export const { definition, componentLoader } = createWidgetDefinition("dockerContainers", {
  icon: IconBrandDocker,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      columns: factory.multiSelect({
        defaultValue: [...allColumnsList],
        options: allColumnsList.map((value) => ({
          value,
          label: (t) => t(columnTranslationKeyMap[value]),
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
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.dockerContainers.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
