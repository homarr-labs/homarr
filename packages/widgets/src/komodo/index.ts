import { IconServer2, IconServerOff } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("komodo", {
  icon: IconServer2,
  supportedIntegrations: ["komodo"],
  integrationsRequired: true,
  maxIntegrations: 1,
  refetchInterval: 30,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.komodo.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
