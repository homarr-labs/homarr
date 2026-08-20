import { IconChartAreaLine, IconServerOff } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";

import { createWidgetDefinition, matchesWidgetRuntimeQuery, widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";
import { createBeszelSystemChoices, resolveStoredBeszelQuerySelection } from "./selection";

const timePeriodOptions = [
  { value: "1m", label: "Live" },
  { value: "1h", label: "1 Hour" },
  { value: "12h", label: "12 Hours" },
  { value: "24h", label: "24 Hours" },
  { value: "1w", label: "1 Week" },
  { value: "30d", label: "30 Days" },
];

export const { definition, componentLoader } = createWidgetDefinition("beszelSystemStats", {
  icon: IconChartAreaLine,
  queryKeys: [[["widget", "beszel", "getSystems"]], [["widget", "beszel", "getSystemStats"]]],
  queryMatcher(query, scope) {
    if (query.path.at(-1) === "getSystems") {
      return widgetQueryInputMatches(query.input, { integrationIds: scope.integrationIds });
    }

    const hasRuntimeStatsQuery = scope.runtimeQueries.some(({ path }) => path.at(-1) === "getSystemStats");
    if (hasRuntimeStatsQuery) return matchesWidgetRuntimeQuery(query, scope);

    const selection = resolveStoredBeszelQuerySelection(String(scope.options.systemId ?? ""), scope.integrationIds);
    if (!selection) return false;
    const dockerEnabled = ["showDockerCpu", "showDockerMemory", "showDockerNetwork"].some(
      (key) => scope.options[key] === true,
    );
    const expected = {
      ...selection,
      timePeriod: scope.options.timePeriod,
    };
    return (
      widgetQueryInputMatches(query.input, { ...expected, includeDocker: false }) ||
      (dockerEnabled && widgetQueryInputMatches(query.input, { ...expected, includeDocker: true }))
    );
  },
  supportedIntegrations: ["beszel", "mock"],
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      systemId: factory.integrationSelect({
        withDescription: true,
        clearable: true,
        useOptions: (integrationIds: string[]) => {
          const {
            data = [],
            isPending,
            isError,
          } = clientApi.widget.beszel.getSystems.useQuery({ integrationIds }, { enabled: integrationIds.length > 0 });
          const selectData = createBeszelSystemChoices(data).map(({ value, label }) => ({ value, label }));
          return { data: selectData, isPending, isError };
        },
      }),
      timePeriod: factory.select({
        defaultValue: "1h",
        options: timePeriodOptions,
      }),
      showCpu: factory.switch({ defaultValue: true }),
      showMemory: factory.switch({ defaultValue: true }),
      showDisk: factory.switch({ defaultValue: true }),
      showDiskIO: factory.switch({ defaultValue: true }),
      showNetwork: factory.switch({ defaultValue: true }),
      showDockerCpu: factory.switch({ defaultValue: true }),
      showDockerMemory: factory.switch({ defaultValue: true }),
      showDockerNetwork: factory.switch({ defaultValue: true }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.beszel.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
