import { IconChartBar, IconSearch } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { openMediaRequestSearch } from "@homarr/spotlight";

import { createWidgetDefinition } from "../../definition";

export const { componentLoader, definition } = createWidgetDefinition("mediaRequests-requestStats", {
  icon: IconChartBar,
  createOptions() {
    return {};
  },
  contextActions: ({ integrationIds }) => [
    {
      key: "search",
      label: (t) => t("search.mode.media.action.search.label"),
      icon: IconSearch,
      onClick: () => {
        openMediaRequestSearch({ integrationIds });
      },
    },
  ],
  supportedIntegrations: getIntegrationKindsByCategory("mediaRequest"),
}).withDynamicImport(() => import("./component"));
