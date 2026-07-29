import { IconBell, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("beszelAlerts", {
  icon: IconBell,
  supportedIntegrations: ["beszel", "mock"],
  integrationsRequired: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showHistory: factory.switch({ defaultValue: true }),
      maxHistoryItems: factory.number({
        defaultValue: 10,
        validate: z.number().min(1).max(100),
      }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.beszelAlerts.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
