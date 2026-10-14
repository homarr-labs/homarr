import { IconChartBar } from "@tabler/icons-react";

import { getWidgetIntegrationConfig } from "@homarr/definitions";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { statsEntriesSchema } from "./config";

export const definition = {
  kind: "stats",
  icon: IconChartBar,
  supportsAdvancedFocus: true,
  ...getWidgetIntegrationConfig("stats"),
  refetchInterval: null,
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        entries: factory.statsEntries(),
        table: factory.switch({ defaultValue: false }),
        rows: factory.switch({ defaultValue: false }),
        plain: factory.switch({ defaultValue: false }),
        showIcon: factory.switch({ defaultValue: true }),
        spacing: factory.select({
          options: (["xs", "sm", "md"] as const).map((value) => ({
            value,
            label: (t) => t(`widget.stats.option.spacing.option.${value}.label`),
          })),
          defaultValue: "xs",
        }),
      }),
      undefined,
      (options, ctx) => {
        const result = statsEntriesSchema.safeParse(options.entries);
        if (!result.success)
          ctx.addIssue({ code: "custom", path: ["entries"], message: "Invalid statistics configuration" });
      },
    );
  },
} satisfies WidgetDefinition & { kind: "stats" };
