import { IconAlignLeft, IconEyeOff, IconGraphFilled, IconListDetails, IconPhoto } from "@tabler/icons-react";

import { objectEntries } from "@homarr/common";
import { invariantTechnicalLabels } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

const labelDisplayModeOptions = {
  textWithIcon: IconListDetails,
  text: IconAlignLeft,
  icon: IconPhoto,
  hidden: IconEyeOff,
} as const;

const getChartOptionLabel = (key: "cpu" | "memory" | "gpu" | "network", t: (key: never) => string) => {
  if (key === "cpu") return invariantTechnicalLabels.cpu;
  if (key === "gpu") return invariantTechnicalLabels.gpu;
  return t(`widget.systemResources.option.visibleCharts.option.${key}` as never);
};

export const { definition, componentLoader } = createWidgetDefinition("systemResources", {
  icon: IconGraphFilled,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "healthMonitoring"]],
  refetchInterval: 10,
  supportedIntegrations: ["dashDot", "openmediavault", "truenas", "unraid", "glances", "synology"],
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
}).withDynamicImport(() => import("./component"));

export type LabelDisplayModeOption = ReturnType<
  (typeof definition)["createOptions"]
>["labelDisplayMode"]["options"][number]["value"];
