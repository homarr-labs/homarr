import { IconDeviceGamepad, IconServerOff } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const widgetKind = "dnsHoleControls";

export const { definition, componentLoader } = createWidgetDefinition(widgetKind, {
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
}).withDynamicImport(() => import("./component"));
