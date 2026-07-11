import { IconSearch, IconZoomQuestion } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { openMediaRequestSearch } from "@homarr/spotlight";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const { componentLoader, definition } = createWidgetDefinition("mediaRequests-requestList", {
  icon: IconZoomQuestion,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      linksTargetNewTab: factory.switch({
        defaultValue: true,
      }),
    }));
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
