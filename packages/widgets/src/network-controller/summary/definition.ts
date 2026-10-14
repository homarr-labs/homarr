import { IconServerOff, IconTopologyFull } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const definition = {
  kind: "networkControllerSummary",
  supportsAdvancedFocus: true,
  icon: IconTopologyFull,
  queryKey: [["widget", "networkController"]],
  refetchInterval: null,
  createOptions() {
    return optionsBuilder.from(() => ({}));
  },
  ...getWidgetIntegrationConfig("networkControllerSummary"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.networkController.error.internalServerError"),
    },
  },
} satisfies WidgetDefinition & { kind: "networkControllerSummary" };
