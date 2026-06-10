import { IconFileText, IconServerOff } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("paperlessNgx", {
  icon: IconFileText,
  supportedIntegrations: ["paperlessNgx"],
  integrationsRequired: true,
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
}).withDynamicImport(() => import("./component"));
