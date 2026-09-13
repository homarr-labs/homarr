import { Center, RingProgress, Text } from "@mantine/core";
import { IconCpu } from "@tabler/icons-react";

import { zoomCompensatedSize } from "@homarr/ui";

import { progressColor } from "../system-health";

export const CpuRing = ({
  cpuUtilization,
  isTiny,
  ariaLabel,
}: {
  cpuUtilization: number;
  isTiny: boolean;
  ariaLabel: string;
}) => {
  const percentage = Math.max(0, Math.min(100, Number(cpuUtilization.toFixed(2))));

  return (
    <RingProgress
      className="health-monitoring-cpu"
      aria-label={ariaLabel}
      roundCaps
      size={isTiny ? 50 : 100}
      thickness={isTiny ? 4 : 8}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- RingProgress renders the custom meter graphic.
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
      aria-valuetext={`${percentage.toFixed(2)}%`}
      sections={[{ value: percentage, color: progressColor(percentage) }]}
      label={
        <Center style={{ flexDirection: "column" }}>
          <Text
            className="health-monitoring-cpu-utilization-value"
            size={isTiny ? "8px" : "xs"}
          >{`${cpuUtilization.toFixed(2)}%`}</Text>
          <IconCpu className="health-monitoring-cpu-utilization-icon" style={zoomCompensatedSize(isTiny ? 8 : 16)} />
        </Center>
      }
    />
  );
};
