import { IconAlignLeft, IconChartLine, IconEyeOff, IconListDetails, IconPhoto } from "@tabler/icons-react";

import { objectEntries } from "@homarr/common";
import { getWidgetIntegrationConfig } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { createWidgetRefreshIntervalOptions } from "../refresh-interval";
import { metricGraphEntriesSchema } from "./config";

const labelDisplayModeOptions = {
  textWithIcon: IconListDetails,
  text: IconAlignLeft,
  icon: IconPhoto,
  hidden: IconEyeOff,
} as const;

export const { definition, componentLoader } = createWidgetDefinition("metricGraph", {
  icon: IconChartLine,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "metricGraph"]],
  refetchInterval: 30,
  ...getWidgetIntegrationConfig("metricGraph"),
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        entries: factory.metricGraphEntries(),
        layout: factory.select({
          options: (["cards", "combined"] as const).map((value) => ({
            value,
            label: (t) => t(`widget.metricGraph.option.layout.option.${value}`),
          })),
          defaultValue: "cards",
        }),
        cardLayout: factory.select({
          options: (["vertical", "horizontal", "grid"] as const).map((value) => ({
            value,
            label: (t) => t(`widget.common.layout.option.${value}`),
          })),
          defaultValue: "grid",
          withDescription: true,
        }),
        timeRange: factory.select({
          options: (["15m", "1h", "6h", "24h"] as const).map((value) => ({
            value,
            label: (t) => t(`widget.metricGraph.option.timeRange.option.${value}`),
          })),
          defaultValue: "1h",
        }),
        hasShadow: factory.switch({ defaultValue: true }),
        labelDisplayMode: factory.select({
          options: objectEntries(labelDisplayModeOptions).map(([key, icon]) => ({
            value: key,
            label: (t) => t(`widget.systemResources.option.labelDisplayMode.option.${key}`),
            icon,
          })),
          defaultValue: "textWithIcon",
        }),
        ...createWidgetRefreshIntervalOptions(30),
      }),
      undefined,
      (options, ctx) => {
        const result = metricGraphEntriesSchema.safeParse(options.entries);
        if (!result.success)
          ctx.addIssue({ code: "custom", path: ["entries"], message: "Invalid metric graph configuration" });
      },
    );
  },
}).withDynamicImport(() => import("./component"));
