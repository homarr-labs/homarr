import { IconServerOff, IconTable } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import {
  KOMODO_DEFAULT_REFRESH_INTERVAL_SECONDS,
  KOMODO_MAX_REFRESH_INTERVAL_SECONDS,
  KOMODO_MIN_REFRESH_INTERVAL_SECONDS,
} from "../komodo/refresh-interval";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("komodoServerOverview", {
  icon: IconTable,
  queryKey: [["widget", "komodo"]],
  supportedIntegrations: ["komodo"],
  integrationsRequired: true,
  maxIntegrations: 1,
  refetchInterval: 30,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showCpu: factory.switch({ defaultValue: true }),
      showMemory: factory.switch({ defaultValue: true }),
      showDisk: factory.switch({ defaultValue: true }),
      showLoadAverage: factory.switch({ defaultValue: true }),
      showNetwork: factory.switch({ defaultValue: true }),
      showVersion: factory.switch({ defaultValue: true }),
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
      message: (t) => t("widget.komodoServerOverview.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
