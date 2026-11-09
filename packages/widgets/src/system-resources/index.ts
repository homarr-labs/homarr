import { IconAlignLeft, IconEyeOff, IconGraphFilled, IconListDetails, IconPhoto } from "@tabler/icons-react";

import { objectEntries } from "@homarr/common";
import { getWidgetIntegrationConfig, invariantTechnicalLabels } from "@homarr/definitions";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

const labelDisplayModeOptions = {
  textWithIcon: IconListDetails,
  text: IconAlignLeft,
  icon: IconPhoto,
  hidden: IconEyeOff,
} as const;

const getChartOptionLabel = (key: "cpu" | "memory" | "gpu" | "network" | "disk", t: (key: never) => string) => {
  if (key === "cpu") return invariantTechnicalLabels.cpu;
  if (key === "gpu") return invariantTechnicalLabels.gpu;
  if (key === "disk") return t("widget.systemDisks.name" as never);
  return t(`widget.systemResources.option.visibleCharts.option.${key}` as never);
};

export const { definition, componentLoader } = createWidgetDefinition("systemResources", {
  icon: IconGraphFilled,
  supportsAdvancedFocus: true,
  queryKey: [["widget", "healthMonitoring"]],
  refetchInterval: 10,
  ...getWidgetIntegrationConfig("systemResources"),
  createOptions() {
    return optionsBuilder.from((factory) => ({
      hasShadow: factory.switch({ defaultValue: true }),
      resourceLayout: factory.select({
        options: (["vertical", "horizontal", "grid"] as const).map((value) => ({
          value,
          label: (t) => t(`widget.common.layout.option.${value}`),
        })),
        defaultValue: "vertical",
        withDescription: true,
      }),
      subresourceLayout: factory.select({
        options: (["vertical", "horizontal", "grid"] as const).map((value) => ({
          value,
          label: (t) => t(`widget.common.layout.option.${value}`),
        })),
        defaultValue: "grid",
        withDescription: true,
      }),
      visibleCharts: factory.multiSelect({
        options: (["cpu", "memory", "gpu", "network", "disk"] as const).map((key) => ({
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
      diskDisplayMode: factory.select({
        options: (["percentage", "free", "absolute", "combined"] as const).map((value) => ({
          value,
          label: (t) => t(`widget.systemResources.option.diskDisplayMode.option.${value}`),
        })),
        defaultValue: "percentage",
      }),
    }));
  },
}).withDynamicImport(() => import("./component"));

export type LabelDisplayModeOption = ReturnType<
  (typeof definition)["createOptions"]
>["labelDisplayMode"]["options"][number]["value"];

export type DiskDisplayModeOption = ReturnType<
  (typeof definition)["createOptions"]
>["diskDisplayMode"]["options"][number]["value"];
