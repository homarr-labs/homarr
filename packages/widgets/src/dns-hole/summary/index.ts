import { IconAd, IconServerOff } from "@tabler/icons-react";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader, serverDataLoader } = createWidgetDefinition("dnsHoleSummary", {
  icon: IconAd,
  options: optionsBuilder.from((factory) => ({
    usePiHoleColors: factory.switch({
      defaultValue: true,
    }),
    layout: factory.select({
      options: (["grid", "row", "column"] as const).map((value) => ({
        value,
        label: (t) => t(`widget.dnsHoleSummary.option.layout.option.${value}.label`),
      })),
      defaultValue: "grid",
    }),
  })),
  supportedIntegrations: ["piHole", "adGuardHome"],
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.dnsHoleSummary.error.internalServerError"),
    },
  },
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));
