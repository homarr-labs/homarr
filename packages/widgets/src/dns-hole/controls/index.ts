import { IconDeviceGamepad, IconServerOff } from "@tabler/icons-react";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader, serverDataLoader } = createWidgetDefinition("dnsHoleControls", {
  icon: IconDeviceGamepad,
  options: optionsBuilder.from((factory) => ({
    showToggleAllButtons: factory.switch({
      defaultValue: true,
    }),
    layout: factory.select({
      options: (["grid", "row", "column"] as const).map((value) => ({
        value,
        label: (t) => t(`widget.dnsHoleControls.option.layout.option.${value}.label`),
      })),
      defaultValue: "grid",
    }),
  })),
  supportedIntegrations: ["piHole", "adGuardHome"],
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.dnsHoleControls.error.internalServerError"),
    },
  },
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));
