import { IconMovie } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition, matchesWidgetRuntimeQuery } from "../definition";
import { widgetQuery } from "../data";
import { optionsBuilder } from "../options";

const pageSizeOptions = ["10", "20", "30", "50"] as const;

export const { componentLoader, definition } = createWidgetDefinition("mediaMissing", {
  icon: IconMovie,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "mediaOrganizer", "getData"]],
  queryMatcher: matchesWidgetRuntimeQuery,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showMissing: factory.switch({ defaultValue: true }),
      showQueued: factory.switch({ defaultValue: true }),
      pageSize: factory.select({
        defaultValue: "10",
        options: pageSizeOptions.map((value) => ({
          value,
          label: value,
        })),
      }),
    }));
  },
  ...getWidgetIntegrationConfig("mediaMissing"),
})
  .withData({
    mode: "queries",
    queries: ({ integrationIds, options, displayMode }) => ({
      main: widgetQuery("widget.mediaOrganizer.getData", {
        integrationIds,
        pageSize: displayMode === "advanced" ? Math.max(50, Number(options.pageSize)) : Number(options.pageSize),
      }),
    }),
  })
  .withDynamicImport(() => import("./component"));
