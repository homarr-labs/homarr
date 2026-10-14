import { IconBrandDocker, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import type { createDockerProcedures } from "@homarr/api/nitro/routers/docker";
import { invariantTechnicalLabels } from "@homarr/definitions";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

type NativeDockerResources = Parameters<typeof createDockerProcedures>[0];
type NativeDockerInventory = Awaited<
  ReturnType<ReturnType<NativeDockerResources["dockerContainersRequestHandler"]["handler"]>["getDataAsync"]>
>;

export type DockerEndpointObservation = {
  data: Awaited<ReturnType<NativeDockerResources["getDockerEndpointsAsync"]>> | undefined;
  isPending: boolean;
  isError: boolean;
};

export type DockerContainerColumn = keyof NativeDockerInventory["data"]["containers"][number];

export interface DefinitionResources {
  useEndpoints: () => DockerEndpointObservation;
}

const columnsList = ["name", "state", "cpuUsage", "memoryUsage"] as const satisfies DockerContainerColumn[];

const allColumnsList = ["name", "state", "host", "cpuUsage", "memoryUsage", "actions"] as const;

const columnTranslationKeyMap = {
  name: "common.field.name",
  state: "docker.field.state.label",
  host: "docker.field.host.label",
  memoryUsage: "docker.field.stats.memory.label",
  actions: "docker.action.title",
} as const satisfies Record<Exclude<(typeof allColumnsList)[number], "cpuUsage">, string>;

export function createDefinition(resources: DefinitionResources) {
  return {
    kind: "dockerContainers",
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
              const { data = [], isPending, isError } = resources.useEndpoints();
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
          containerFilter: factory.multiText({
            defaultValue: [] as string[],
            validate: z.string(),
          }),
          filterIsWhitelist: factory.switch({
            defaultValue: false,
          }),
          filterCaseSensitive: factory.switch({
            defaultValue: true,
          }),
          filterAllowWildcards: factory.switch({
            defaultValue: false,
            withDescription: true,
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
  } satisfies WidgetDefinition & { kind: "dockerContainers" };
}
