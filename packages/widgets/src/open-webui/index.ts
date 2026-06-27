import { IconRobot, IconServerOff } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const widgetKind = "openWebUi";

export const { definition, componentLoader } = createWidgetDefinition(widgetKind, {
  icon: IconRobot,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      systemPrompt: factory.text({
        defaultValue: "",
        withDescription: true,
      }),
      showHistory: factory.switch({
        defaultValue: true,
        withDescription: true,
      }),
    }));
  },
  supportedIntegrations: ["openWebUi"],
  integrationsRequired: true,
  maxIntegrations: 1,
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.openWebUi.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
