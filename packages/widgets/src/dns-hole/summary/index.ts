import { IconAd, IconServerOff } from "@tabler/icons-react";


import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const widgetKind = "dnsHoleSummary";

export const { definition, componentLoader } = createWidgetDefinition(widgetKind, {
  supportsAdvancedFocus: false,
  icon: IconAd,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      usePiHoleColors: factory.switch({
        defaultValue: true,
      }),
      layout: factory.select({
        options: (["grid", "row", "column"] as const).map((value) => ({
          value,
          label: (t) => {
            if (value === "grid") return t("widget.common.layout.option.grid");
            if (value === "row") return t("widget.common.layout.option.horizontal");
            return t("widget.common.layout.option.vertical");
          },
        })),
        defaultValue: "grid",
      }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.dnsHoleSummary.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
