import { IconDeviceGamepad, IconServerOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const definition = {
  kind: "dnsHoleControls",
  supportsAdvancedFocus: false,
  icon: IconDeviceGamepad,
  queryKey: [["widget", "dnsHole"]],
  refetchInterval: 10,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showToggleAllButtons: factory.switch({
        defaultValue: true,
      }),
    }));
  },
  ...getWidgetIntegrationConfig("dnsHoleControls"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.dnsHoleControls.error.internalServerError"),
    },
  },
} satisfies WidgetDefinition & { kind: "dnsHoleControls" };
