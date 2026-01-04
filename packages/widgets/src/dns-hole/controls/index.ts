import IconDeviceGamepad from "@tabler/icons-react/icons/IconDeviceGamepad";
import IconServerOff from "@tabler/icons-react/icons/IconServerOff";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const widgetKind = "dnsHoleControls";

export const { definition, componentLoader } = createWidgetDefinition(widgetKind, {
  icon: IconDeviceGamepad,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      showToggleAllButtons: factory.switch({
        defaultValue: true,
      }),
    }));
  },
  supportedIntegrations: getIntegrationKindsByCategory("dnsHole"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.dnsHoleControls.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
