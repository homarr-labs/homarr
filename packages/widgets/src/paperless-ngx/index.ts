import { IconFileText, IconServerOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { widgetQuery } from "../data";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("paperlessNgx", {
  supportsAdvancedFocus: false,
  icon: IconFileText,
  refetchInterval: null,
  ...getWidgetIntegrationConfig("paperlessNgx"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showInboxRatio: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showInboxRing: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showDocumentsTotal: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showDocumentsInbox: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showCorrespondents: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showTags: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showDocumentTypes: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.paperlessNgx.error.internalServerError"),
    },
  },
})
  .withData({
    mode: "queries",
    queries: ({ integrationIds }) => ({
      main: widgetQuery("widget.paperlessNgx.getStats", { integrationId: integrationIds[0] ?? "" }),
    }),
  })
  .withDynamicImport(() => import("./component"));
