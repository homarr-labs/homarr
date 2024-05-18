import { IconAd } from "@tabler/icons-react";

import { createWidgetDefinition } from "../../definition";
import { optionsBuilder } from "../../options";

export const { definition, componentLoader, serverDataLoader } =
  createWidgetDefinition("dnsHoleSummary", {
    icon: IconAd,
    options: optionsBuilder.from((factory) => ({
      usePiHoleColors: factory.switch({
        defaultValue: true,
      }),
      layout: factory.select({
        options: ["grid", "row", "column"],
        defaultValue: "grid",
      }),
    })),
    supportedIntegrations: ["piHole"],
  })
    .withServerData(() => import("./serverData"))
    .withDynamicImport(() => import("./component"));
