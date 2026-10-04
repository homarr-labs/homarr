import { IconReportSearch, IconServerOff, IconTestPipe } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

const createOptions = () =>
  optionsBuilder.from((factory) => ({
    openIndexerSiteInNewTab: factory.switch({
      defaultValue: true,
    }),
  }));

export const { definition, componentLoader } = createWidgetDefinition("indexerManager", {
  icon: IconReportSearch,
  contextActions: ({ widgetRuntimeRef, context }) => [
    {
      key: "test-all-indexers",
      label: "widget.indexerManager.testAll",
      icon: IconTestPipe,
      disabled:
        context.isEditMode ||
        !context.canInteractWithSelectedIntegrations ||
        typeof widgetRuntimeRef.current.actions.testAllIndexers !== "function",
      onClick: () => {
        widgetRuntimeRef.current.actions.testAllIndexers?.();
      },
    },
  ],
  refetchInterval: null,
  createOptions,
  ...getWidgetIntegrationConfig("indexerManager"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.indexerManager.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
