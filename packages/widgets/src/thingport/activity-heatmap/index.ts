import { IconCalendarStats } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition, matchesWidgetRuntimeQuery } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader } = createWidgetDefinition("thingport-activityHeatmap", {
  icon: IconCalendarStats,
  supportsAdvancedFocus: false,
  queryKey: [["widget", "thingport", "getActivity"]],
  queryMatcher: matchesWidgetRuntimeQuery,
  refetchInterval: null,
  ...getWidgetIntegrationConfig("thingport-activityHeatmap"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showTitle: factory.switch({ defaultValue: false }),
      weekStart: factory.select({
        options: [
          {
            label: (t) => t("widget.thingport-activityHeatmap.option.weekStart.option.sunday"),
            value: "sunday",
          },
          {
            label: (t) => t("widget.thingport-activityHeatmap.option.weekStart.option.monday"),
            value: "monday",
          },
        ] as const,
        defaultValue: "sunday",
      }),
      showTotal: factory.switch({ defaultValue: true }),
      showLegend: factory.switch({ defaultValue: true }),
    }));
  },
}).withDynamicImport(() => import("./component"));
