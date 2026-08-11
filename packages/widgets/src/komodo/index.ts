import { IconServer2, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import {
  KOMODO_DEFAULT_REFRESH_INTERVAL_SECONDS,
  KOMODO_MAX_REFRESH_INTERVAL_SECONDS,
  KOMODO_MIN_REFRESH_INTERVAL_SECONDS,
} from "./refresh-interval";

export const { definition, componentLoader } = createWidgetDefinition("komodo", {
  icon: IconServer2,
  supportedIntegrations: ["komodo"],
  integrationsRequired: true,
  maxIntegrations: 1,
  refetchInterval: 30,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showServers: factory.switch({ defaultValue: true }),
      showStacks: factory.switch({ defaultValue: true }),
      showDeployments: factory.switch({ defaultValue: true }),
      showProblems: factory.switch({ defaultValue: true }),
      refreshInterval: factory.slider({
        defaultValue: KOMODO_DEFAULT_REFRESH_INTERVAL_SECONDS,
        validate: z.number().min(KOMODO_MIN_REFRESH_INTERVAL_SECONDS).max(KOMODO_MAX_REFRESH_INTERVAL_SECONDS),
        step: 1,
        withDescription: true,
      }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.komodo.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
