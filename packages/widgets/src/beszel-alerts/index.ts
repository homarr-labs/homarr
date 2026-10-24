import { IconBell, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition, matchesWidgetRuntimeQuery, widgetQueryInputMatches } from "../definition";
import { optionsBuilder } from "../options";
import { widgetQuery } from "../data";
import { getBeszelAlertsQueryInput } from "./display";

export const { definition, componentLoader } = createWidgetDefinition("beszelAlerts", {
  icon: IconBell,
  queryKey: [["widget", "beszel", "getAlerts"]],
  queryMatcher(query, scope) {
    const hasRuntimeAlertsQuery = scope.runtimeQueries.some(({ path }) => path.at(-1) === "getAlerts");
    if (hasRuntimeAlertsQuery) return matchesWidgetRuntimeQuery(query, scope);

    return widgetQueryInputMatches(query.input, {
      integrationIds: scope.integrationIds,
      includeHistory: scope.options.showHistory,
      maxHistoryItems: scope.options.maxHistoryItems,
    });
  },
  ...getWidgetIntegrationConfig("beszelAlerts"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showHistory: factory.switch({ defaultValue: true }),
      maxHistoryItems: factory.number({
        defaultValue: 10,
        validate: z.number().min(1).max(100),
      }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.beszel.error.internalServerError"),
    },
  },
})
  .withData({
    mode: "queries",
    queries: ({ integrationIds, options, displayMode }) => ({
      main: widgetQuery(
        "widget.beszel.getAlerts",
        getBeszelAlertsQueryInput(integrationIds, options, displayMode === "advanced"),
      ),
    }),
  })
  .withDynamicImport(() => import("./component"));
