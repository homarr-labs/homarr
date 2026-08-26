import { IconRoute, IconRouteOff } from "@tabler/icons-react";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("traefik", {
  icon: IconRoute,
  supportsAdvancedFocus: true,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showTcp: factory.switch({
        defaultValue: true,
      }),
      showUdp: factory.switch({
        defaultValue: true,
      }),
      showEntryPoints: factory.switch({
        defaultValue: true,
      }),
    }));
  },
  supportedIntegrations: ["traefik", "mock"],
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconRouteOff,
      message: (t) => t("widget.traefik.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
