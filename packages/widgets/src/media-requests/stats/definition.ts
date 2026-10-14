import { IconChartBar, IconSearch } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";
import { openMediaRequestSearch } from "@homarr/spotlight/open";

import type { WidgetDefinition } from "../../definition";

const createOptions = () => ({});

export const definition = {
  kind: "mediaRequests-requestStats",
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
} satisfies WidgetDefinition & { kind: "mediaRequests-requestStats" };
