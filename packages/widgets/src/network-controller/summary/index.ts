import { IconTopologyFull, IconServerOff } from "@tabler/icons-react";

import { getIntegrationKindsByCategory } from "@homarr/definitions";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const widgetKind = "networkControllerSummary";

export const { definition, componentLoader } = createWidgetDefinition(widgetKind, {
  icon: IconTopologyFull,
  options: optionsBuilder.from((factory) => ({
    layout: factory.select({
      options: (["row", "column"] as const).map((value) => ({
        value,
        label: (t) => t(`widget.networkControllerSummary.option.layout.option.${value}.label`),
      })),
      defaultValue: "row",
    }),
    content: factory.multiSelect({
      options: ([
        "wwwLatency", 
        "wwwPing", 
        "wwwUptime",
        "wifiUsers",
        "wifiGuests",
        "lanUsers",
        "lanGuests",
        "vpnUsers",
      ] as const).map((value) => ({
        value,
        label: (t) => t(`widget.networkControllerSummary.option.content.option.${value}.label`),
      })),
      defaultValue: ["wifiUsers"],
    }),

  })),
  supportedIntegrations: getIntegrationKindsByCategory("networkController"),
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.networkController.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
