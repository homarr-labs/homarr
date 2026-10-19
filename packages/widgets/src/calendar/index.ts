import { IconCalendar } from "@tabler/icons-react";
import { z } from "zod/v4";

import { getWidgetIntegrationConfig } from "@homarr/definitions";
import { radarrReleaseTypes } from "@homarr/integrations/types";

import { createWidgetDefinition, matchesWidgetRuntimeQuery } from "../definition";
import { optionsBuilder } from "../options";
import { widgetQuery } from "../data";
import { getCalendarQueryInput, getUnambiguousCalendarMonth } from "./query-input";
import { calendarViews } from "./calendar-view";

export const { definition, componentLoader } = createWidgetDefinition("calendar", {
  icon: IconCalendar,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "calendar", "findAllEvents"]],
  queryMatcher: matchesWidgetRuntimeQuery,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      viewMode: factory.select({
        defaultValue: "compact",
        options: calendarViews.map((value) => ({
          value,
          label: (t) => t(`widget.calendar.view.${value}`),
        })),
      }),
      releaseType: factory.multiSelect({
        defaultValue: ["inCinemas", "digitalRelease"],
        options: radarrReleaseTypes.map((value) => ({
          value,
          label: (t) => t(`widget.calendar.option.releaseType.options.${value}`),
        })),
      }),
      filterPastMonths: factory.number({
        validate: z.number().min(2).max(9999),
        defaultValue: 2,
      }),
      filterFutureMonths: factory.number({
        validate: z.number().min(2).max(9999),
        defaultValue: 2,
      }),
      showUnmonitored: factory.switch({
        defaultValue: false,
      }),
    }));
  },
  ...getWidgetIntegrationConfig("calendar"),
})
  .withData({
    mode: "browser",
    reason: "The initial month depends on the browser timezone.",
    stream: true,
    queries: ({ options, integrationIds }) => {
      const month = getUnambiguousCalendarMonth();
      return {
        main: month
          ? widgetQuery("widget.calendar.findAllEvents", getCalendarQueryInput(integrationIds, options, month))
          : null,
      };
    },
  })
  .withDynamicImport(() => import("./component"));
