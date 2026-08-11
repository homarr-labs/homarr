import { IconServerOff, IconTable } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
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
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.komodoServerOverview.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
