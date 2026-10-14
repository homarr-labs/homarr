import { IconRoute, IconRouteOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const definition = {
  kind: "traefik",
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
  ...getWidgetIntegrationConfig("traefik"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconRouteOff,
      message: (t) => t("widget.traefik.error.internalServerError"),
    },
  },
} satisfies WidgetDefinition & { kind: "traefik" };
