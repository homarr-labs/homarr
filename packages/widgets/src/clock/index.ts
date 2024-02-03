import { IconClock } from "@homarr/ui";

import { createWidgetDefinition } from "../definition";
import { opt } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("clock", {
  icon: IconClock,
  supportedIntegrations: ["adGuardHome", "piHole"],
  options: opt.from(
    (fac) => ({
      is24HourFormat: fac.switch({
        defaultValue: true,
        withDescription: true,
      }),
      isLocaleTime: fac.switch({ defaultValue: true }),
      timezone: fac.select({
        options: ["Europe/Berlin", "Europe/London", "Europe/Moscow"] as const,
        defaultValue: "Europe/Berlin",
      }),
    }),
    {
      timezone: {
        shouldHide: (options) => options.isLocaleTime,
      },
    },
  ),
}).withDynamicImport(() => import("./component"));
