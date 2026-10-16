import { IconChartBar, IconSearch } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";
import { openMediaRequestSearch } from "@homarr/spotlight";

import { createWidgetDefinition } from "../../definition";
import { widgetQuery } from "../../data";

const createOptions = () => ({});

export const { componentLoader, definition } = createWidgetDefinition("mediaRequests-requestStats", {
  supportsAdvancedFocus: false,
  icon: IconChartBar,
  queryKey: [["widget", "mediaRequests", "getStats"]],
  createOptions,
  contextActions: ({ integrationIds }) => [
    {
      key: "search",
      label: "search.mode.media.action.search.label",
      icon: IconSearch,
      onClick: () => {
        openMediaRequestSearch({ integrationIds });
      },
    },
  ],
  ...getWidgetIntegrationConfig("mediaRequests-requestStats"),
})
  .withData({
    mode: "queries",
    queries: ({ integrationIds }) => ({ main: widgetQuery("widget.mediaRequests.getStats", { integrationIds }) }),
  })
  .withDynamicImport(() => import("./component"));
