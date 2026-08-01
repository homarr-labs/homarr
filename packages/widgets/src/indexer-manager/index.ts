import { IconReportSearch, IconServerOff, IconTestPipe } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("indexerManager", {
  icon: IconReportSearch,
  contextActions: ({ widgetStateRef, context }) => [
    {
      key: "test-all-indexers",
      label: (t) => t("widget.indexerManager.testAll"),
      icon: IconTestPipe,
      disabled:
        context.isEditMode ||
        !context.canInteractWithSelectedIntegrations ||
        typeof widgetStateRef?.current?.testAllIndexers !== "function",
      onClick: () => {
        const action = widgetStateRef?.current?.testAllIndexers;
        if (typeof action === "function") action();
      },
    },
  ],
  refetchInterval: null,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      openIndexerSiteInNewTab: factory.switch({
        defaultValue: true,
      }),
    }));
  },
  supportedIntegrations: getIntegrationKindsByCategory("indexerManager"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.indexerManager.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
