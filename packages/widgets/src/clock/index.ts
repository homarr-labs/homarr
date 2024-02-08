import { IconClock } from "@homarr/ui";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader, serverDataLoader } =
  createWidgetDefinition("clock", {
    icon: IconClock,
    supportedIntegrations: ["adGuardHome", "piHole"],
    options: optionsBuilder.from(
      (factory) => ({
        is24HourFormat: factory.switch({
          defaultValue: true,
          withDescription: true,
        }),
        isLocaleTime: factory.switch({ defaultValue: true }),
        timezone: factory.select({
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
  })
    .withServerData(() => import("./serverData"))
    .withDynamicImport(() => import("./component"));
