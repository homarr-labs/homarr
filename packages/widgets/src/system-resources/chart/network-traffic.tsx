import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";

import { useByteFormatter } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";

import type { LabelDisplayModeOption } from "..";
import { CommonChart } from "./common-chart";

export const NetworkTrafficChart = ({
  usageOverTime,
  isUp,
  hasShadow,
  labelDisplayMode,
  advanced = false,
}: {
  usageOverTime: (number | null)[];
  isUp: boolean;
  hasShadow: boolean;
  labelDisplayMode: LabelDisplayModeOption;
  advanced?: boolean;
}) => {
  const chartData = usageOverTime.map((usage, index) => ({ index, usage }));
  const t = useI18n("widget.systemResources.card");
  const { formatByteRate } = useByteFormatter();

  const max = Math.max(0, ...usageOverTime.filter((value) => value !== null));
  const upperBound = max + max * 0.2;
  const latest = usageOverTime.at(-1);

  return (
    <CommonChart
      data={chartData}
      series={[{ name: "usage", color: "yellow.5" }]}
      title={isUp ? t("up") : t("down")}
      icon={isUp ? IconArrowUp : IconArrowDown}
      yDomain={[0, upperBound]}
      lastValue={latest == null ? undefined : formatByteRate(Math.round(latest))}
      chartType={hasShadow ? "area" : "line"}
      labelDisplayMode={labelDisplayMode}
      advanced={advanced}
      tooltipLabel={(index) => {
        const value = usageOverTime[index];
        if (value != null) return formatByteRate(Math.round(value));
      }}
    />
  );
};
