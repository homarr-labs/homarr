import dayjs from "dayjs";

import { IconClock } from "@homarr/ui";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("clock", {
  icon: IconClock,
  options: optionsBuilder.from(
    (fac) => ({
      customTitle: fac.text({
        defaultValue: "",
        withDescription: true,
      }),
      is24HourFormat: fac.switch({
        defaultValue: true,
        withDescription: true,
      }),
      showSeconds: fac.switch({
        defaultValue: false,
      }),
      useCustomTimezone: fac.switch({ defaultValue: false }),
      timezone: fac.select({
        options: Intl.supportedValuesOf("timeZone").map((value) => value),
        defaultValue: "Europe/London",
        searchable: true,
        withDescription: true,
      }),
      showDate: fac.switch({
        defaultValue: true,
      }),
      dateFormat: fac.select({
        options: [
          { value: "dddd, MMMM D", label: dayjs().format("dddd, MMMM D") },
          { value: "dddd, D MMMM", label: dayjs().format("dddd, D MMMM") },
          { value: "MMM D", label: dayjs().format("MMM D") },
          { value: "D MMM", label: dayjs().format("D MMM") },
          { value: "DD/MM/YYYY", label: dayjs().format("DD/MM/YYYY") },
          { value: "MM/DD/YYYY", label: dayjs().format("MM/DD/YYYY") },
          { value: "DD/MM", label: dayjs().format("DD/MM") },
          { value: "MM/DD", label: dayjs().format("MM/DD") },
        ],
        defaultValue: "dddd, MMMM D",
        withDescription: true,
      }),
    }),
    {
      timezone: {
        shouldHide: (options) => !options.useCustomTimezone,
      },
      dateFormat: {
        shouldHide: (options) => !options.showDate,
      },
    },
  ),
})
  .withServerData(() => import("./serverData"))
  .withDynamicImport(() => import("./component"));
