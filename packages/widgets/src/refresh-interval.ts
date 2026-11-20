import { z } from "zod/v4";

import { widgetRefreshIntervalPresets, widgetRefreshIntervalSchema } from "@homarr/validation/widget-refresh-interval";

import { optionsBuilder } from "./options";

export const createWidgetRefreshIntervalOptions = (defaultInterval: number) =>
  optionsBuilder.from(
    (factory) => ({
      refreshInterval: factory.text({
        defaultValue: String(defaultInterval),
        suggestions: [...new Set<number>([...widgetRefreshIntervalPresets, defaultInterval])]
          .toSorted((left, right) => left - right)
          .map(String),
        validate: z
          .string()
          .regex(/^\d+$/)
          .refine((value) => widgetRefreshIntervalSchema.safeParse(Number(value)).success),
      }),
    }),
    {
      refreshInterval: {
        advanced: true,
      },
    },
  );

export const getWidgetRefreshInterval = (options: { refreshInterval?: unknown }, defaultInterval: number) => {
  const result = widgetRefreshIntervalSchema.safeParse(Number(options.refreshInterval ?? defaultInterval));
  return result.success ? result.data : defaultInterval;
};
