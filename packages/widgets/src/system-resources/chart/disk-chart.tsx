import { IconDatabase } from "@tabler/icons-react";

import { useByteFormatter } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";

import type { DiskDisplayModeOption, LabelDisplayModeOption } from "..";
import { CommonChart } from "./common-chart";

export interface DiskSample {
  deviceName: string;
  used: string;
  available: string;
  percentage: number;
}

export const SystemResourceDiskChart = ({
  deviceName,
  samples,
  hasShadow,
  labelDisplayMode,
  displayMode = "percentage",
  advanced = false,
}: {
  deviceName: string;
  samples: (DiskSample | null)[];
  hasShadow: boolean;
  labelDisplayMode: LabelDisplayModeOption;
  displayMode?: DiskDisplayModeOption;
  advanced?: boolean;
}) => {
  const { formatBytesPair } = useByteFormatter();
  const t = useI18n("widget.systemResources.card");
  const chartData = samples.map((sample, index) => ({
    index,
    usage: sample === null ? null : Math.min(100, Math.max(0, sample.percentage)),
  }));
  const formatCapacity = (sample: DiskSample, mode: DiskDisplayModeOption) => {
    const percentage = Math.min(100, Math.max(0, sample.percentage));
    if (mode === "free") return `${Math.round(100 - percentage)}%`;
    const percent = Math.round(percentage);
    if (mode === "percentage") return `${percent}%`;

    const used = Number(sample.used);
    const available = Number(sample.available);
    // Some providers return formatted sizes instead of byte counts. Their
    // reported percentage remains usable without guessing units or total capacity.
    if (!Number.isFinite(used) || !Number.isFinite(available) || used < 0 || available < 0) {
      return `${percent}%`;
    }
    const sizes = formatBytesPair(Math.round(used), Math.round(used + available));
    if (mode === "absolute") return `${sizes.used} / ${sizes.total}`;
    return t("memoryTooltip", { used: sizes.used, available: sizes.total, percent });
  };
  const latest = samples.at(-1);

  return (
    <CommonChart
      data={chartData}
      dataKey="index"
      series={[{ name: "usage", color: "violet.5" }]}
      title={deviceName}
      icon={IconDatabase}
      labelDisplayMode={labelDisplayMode}
      advanced={advanced}
      yAxisProps={{ domain: [0, 100] }}
      lastValue={latest == null ? undefined : formatCapacity(latest, displayMode)}
      chartType={hasShadow ? "area" : "line"}
      tooltipLabel={(index) => {
        const sample = samples[index];
        if (!sample) return undefined;
        return `${deviceName}: ${formatCapacity(sample, "combined")}`;
      }}
    />
  );
};
