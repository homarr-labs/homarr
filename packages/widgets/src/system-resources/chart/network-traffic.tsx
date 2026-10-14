import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import type { LabelDisplayModeOption } from "..";
import { CommonChart } from "./common-chart";
import type { SystemResourcePresentation } from "../native-view-types";

export const NetworkTrafficChart = ({
  usageOverTime,
  isUp,
  hasShadow,
  labelDisplayMode,
  advanced = false,
  presentation,
}: {
  usageOverTime: number[];
  isUp: boolean;
  hasShadow: boolean;
  labelDisplayMode: LabelDisplayModeOption;
  advanced?: boolean;
  presentation: SystemResourcePresentation;
}) => {
  const chartData = usageOverTime.map((usage, index) => ({ index, usage }));
  const t = useI18n("widget.systemResources.card");
  const { formatByteRate } = presentation;

  const max = Math.max(...usageOverTime);
  const upperBound = max + max * 0.2;
  const latest = usageOverTime.at(-1) ?? 0;

  return (
    <CommonChart
      presentation={presentation}
      data={chartData}
      dataKey={"index"}
      series={[{ name: "usage", color: "yellow.5" }]}
      title={isUp ? t("up") : t("down")}
      icon={isUp ? IconArrowUp : IconArrowDown}
      yAxisProps={{ domain: [0, upperBound] }}
      lastValue={formatByteRate(Math.round(latest))}
      chartType={hasShadow ? "area" : "line"}
      labelDisplayMode={labelDisplayMode}
      advanced={advanced}
      tooltipLabel={(index) => formatByteRate(Math.round(usageOverTime[index] ?? 0))}
    />
  );
};
