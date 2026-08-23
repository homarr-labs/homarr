import { IconChartBar, IconSearch } from "@tabler/icons-react";

import { openMediaRequestSearch } from "@homarr/spotlight";

import { createWidgetDefinition } from "../../definition";

const createOptions = () => ({});

export const { componentLoader, definition } = createWidgetDefinition("mediaRequests-requestStats", {
  supportsAdvancedFocus: false,
  icon: IconChartBar,
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
}).withDynamicImport(() => import("./component"));
