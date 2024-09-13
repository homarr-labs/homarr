import { IconReportSearch, IconServerOff } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader, serverDataLoader } = createWidgetDefinition("indexerManager", {
  icon: IconReportSearch,
  options: optionsBuilder.from((factory) => ({
    openIndexerSiteInNewTab: factory.switch({
      defaultValue: true,
    }),
  })),
  supportedIntegrations: getIntegrationKindsByCategory("indexerManager"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.indexerManager.error.internalServerError"),
    },
  },
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));
