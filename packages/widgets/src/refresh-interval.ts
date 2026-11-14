import { widgetRefreshIntervalPresets, widgetRefreshIntervalSchema } from "@homarr/validation/widget-refresh-interval";

import { optionsBuilder } from "./options";

export const createWidgetRefreshIntervalOptions = (defaultInterval: number) =>
  optionsBuilder.from(
    (factory) => ({
      refreshInterval: factory.select({
        defaultValue: String(defaultInterval),
        options: [
          ...[...new Set<number>([...widgetRefreshIntervalPresets, defaultInterval])]
            .toSorted((left, right) => left - right)
            .map((value) => ({ value: String(value), label: `${value} s` })),
          { value: "custom", label: (t) => t("widget.common.refreshInterval.custom") },
        ],
        allowDeselect: false,
        withDescription: true,
      }),
      customRefreshInterval: factory.number({
        defaultValue: defaultInterval,
        validate: widgetRefreshIntervalSchema,
        step: 1,
        withDescription: true,
      }),
    }),
    {
      customRefreshInterval: {
        shouldHide(options) {
          return options.refreshInterval !== "custom";
        },
      },
    },
  );

export const getWidgetRefreshInterval = (
  options: { refreshInterval?: string; customRefreshInterval?: number },
  defaultInterval: number,
) => {
  const result = widgetRefreshIntervalSchema.safeParse(
    options.refreshInterval === "custom"
      ? options.customRefreshInterval
      : Number(options.refreshInterval ?? defaultInterval),
  );
  return result.success ? result.data : defaultInterval;
};
