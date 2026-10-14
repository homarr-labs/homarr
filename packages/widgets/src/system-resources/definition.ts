import { IconAlignLeft, IconEyeOff, IconGraphFilled, IconListDetails, IconPhoto } from "@tabler/icons-react";

import { objectEntries } from "@homarr/common";
import { getWidgetIntegrationConfig, invariantTechnicalLabels } from "@homarr/definitions";

import type { WidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

const labelDisplayModeOptions = {
  textWithIcon: IconListDetails,
  text: IconAlignLeft,
  icon: IconPhoto,
  hidden: IconEyeOff,
} as const;

const getChartOptionLabel = (
  key: "cpu" | "memory" | "gpu" | "network",
  t: (key: `widget.systemResources.option.visibleCharts.option.${"memory" | "network"}`) => string,
) => {
  if (key === "cpu") return invariantTechnicalLabels.cpu;
  if (key === "gpu") return invariantTechnicalLabels.gpu;
  return t(`widget.systemResources.option.visibleCharts.option.${key}`);
};

export const definition = {
  kind: "systemResources",
  icon: IconGraphFilled,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "healthMonitoring"]],
  refetchInterval: 10,
  ...getWidgetIntegrationConfig("systemResources"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      hasShadow: factory.switch({ defaultValue: true }),
      visibleCharts: factory.multiSelect({
        options: (["cpu", "memory", "gpu", "network"] as const).map((key) => ({
          value: key,
          label: (t) => getChartOptionLabel(key, t),
        })),
        defaultValue: ["cpu", "memory", "network"],
        withDescription: true,
      }),
      labelDisplayMode: factory.select({
        options: objectEntries(labelDisplayModeOptions).map(([key, icon]) => ({
          value: key,
          label: (t) => t(`widget.systemResources.option.labelDisplayMode.option.${key}`),
          icon,
        })),
        defaultValue: "textWithIcon",
      }),
    }));
  },
} satisfies WidgetDefinition & { kind: "systemResources" };
