import { IconBrandDocker, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import {
  KOMODO_DEFAULT_REFRESH_INTERVAL_SECONDS,
  KOMODO_MAX_REFRESH_INTERVAL_SECONDS,
  KOMODO_MIN_REFRESH_INTERVAL_SECONDS,
} from "./komodo-refresh-interval";

const columnsList = [
  "name",
  "state",
  "cpuUsage",
  "memoryUsage",
] as const satisfies (keyof RouterOutputs["docker"]["getContainers"]["containers"][number])[];

const allColumnsList = ["name", "state", "host", "cpuUsage", "memoryUsage", "actions"] as const;
const viewOptions = ["containers", "servers"] as const;

const columnTranslationKeyMap = {
  name: "docker.field.name.label",
  state: "docker.field.state.label",
  host: "docker.field.host.label",
  cpuUsage: "docker.field.stats.cpu.label",
  memoryUsage: "docker.field.stats.memory.label",
  actions: "docker.action.title",
} as const satisfies Record<(typeof allColumnsList)[number], string>;

const isKomodoSelected = (integrationKinds: string[]) => integrationKinds.includes("komodo");

export const { definition, componentLoader } = createWidgetDefinition("dockerContainers", {
  icon: IconBrandDocker,
  queryKey: [["docker", "getContainers"]],
  queryKeys: [[["docker", "getContainers"]], [["widget", "komodo"]]],
  refetchInterval: 30,
  supportedIntegrations: ["komodo"],
  integrationsRequired: false,
  maxIntegrations: 1,
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        view: factory.select({
          defaultValue: "containers",
          options: viewOptions.map((value) => ({
            value,
            label: (t) => t(`widget.dockerContainers.option.view.option.${value}`),
          })),
        }),
        showSummary: factory.switch({ defaultValue: true, skipContextMenu: true }),
        showServers: factory.switch({ defaultValue: true, skipContextMenu: true }),
        showStacks: factory.switch({ defaultValue: true, skipContextMenu: true }),
        showDeployments: factory.switch({ defaultValue: true, skipContextMenu: true }),
        showProblems: factory.switch({ defaultValue: true, skipContextMenu: true }),
        refreshInterval: factory.slider({
          defaultValue: KOMODO_DEFAULT_REFRESH_INTERVAL_SECONDS,
          validate: z.number().min(KOMODO_MIN_REFRESH_INTERVAL_SECONDS).max(KOMODO_MAX_REFRESH_INTERVAL_SECONDS),
          step: 1,
          withDescription: true,
        }),
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
        showCpu: factory.switch({ defaultValue: true, skipContextMenu: true }),
        showMemory: factory.switch({ defaultValue: true, skipContextMenu: true }),
        showDisk: factory.switch({ defaultValue: true, skipContextMenu: true }),
        showLoadAverage: factory.switch({ defaultValue: true, skipContextMenu: true }),
        showNetwork: factory.switch({ defaultValue: true, skipContextMenu: true }),
        showVersion: factory.switch({ defaultValue: true, skipContextMenu: true }),
        columnOrder: factory.text({ defaultValue: "" }),
        columnWidths: factory.text({ defaultValue: "" }),
      }),
      {
        view: { shouldHide: (_, integrationKinds) => !isKomodoSelected(integrationKinds) },
        showSummary: { shouldHide: (_, integrationKinds) => !isKomodoSelected(integrationKinds) },
        showServers: {
          shouldHide: (options, integrationKinds) => !isKomodoSelected(integrationKinds) || !options.showSummary,
        },
        showStacks: {
          shouldHide: (options, integrationKinds) => !isKomodoSelected(integrationKinds) || !options.showSummary,
        },
        showDeployments: {
          shouldHide: (options, integrationKinds) => !isKomodoSelected(integrationKinds) || !options.showSummary,
        },
        showProblems: {
          shouldHide: (options, integrationKinds) => !isKomodoSelected(integrationKinds) || !options.showSummary,
        },
        refreshInterval: { shouldHide: (_, integrationKinds) => !isKomodoSelected(integrationKinds) },
        columns: {
          shouldHide: (options, integrationKinds) => isKomodoSelected(integrationKinds) && options.view === "servers",
        },
        enableRowSorting: {
          shouldHide: (options, integrationKinds) => isKomodoSelected(integrationKinds) && options.view === "servers",
        },
        defaultSort: {
          shouldHide: (options, integrationKinds) => isKomodoSelected(integrationKinds) && options.view === "servers",
        },
        descendingDefaultSort: {
          shouldHide: (options, integrationKinds) => isKomodoSelected(integrationKinds) && options.view === "servers",
        },
        showCpu: {
          shouldHide: (options, integrationKinds) => !isKomodoSelected(integrationKinds) || options.view !== "servers",
        },
        showMemory: {
          shouldHide: (options, integrationKinds) => !isKomodoSelected(integrationKinds) || options.view !== "servers",
        },
        showDisk: {
          shouldHide: (options, integrationKinds) => !isKomodoSelected(integrationKinds) || options.view !== "servers",
        },
        showLoadAverage: {
          shouldHide: (options, integrationKinds) => !isKomodoSelected(integrationKinds) || options.view !== "servers",
        },
        showNetwork: {
          shouldHide: (options, integrationKinds) => !isKomodoSelected(integrationKinds) || options.view !== "servers",
        },
        showVersion: {
          shouldHide: (options, integrationKinds) => !isKomodoSelected(integrationKinds) || options.view !== "servers",
        },
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
