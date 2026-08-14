import { IconChartBar, IconSearch } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { openMediaRequestSearch } from "@homarr/spotlight";

import { createWidgetDefinition } from "../../definition";

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
  supportedIntegrations: getIntegrationKindsByCategory("mediaRequest"),
}).withDynamicImport(() => import("./component"));
