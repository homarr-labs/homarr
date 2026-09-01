import { GaugeChart } from "@mantine/charts";
import { Center, Text } from "@mantine/core";
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
  return (
    <GaugeChart
      className="health-monitoring-cpu"
      aria-label={ariaLabel}
      roundCaps
      size={isTiny ? 50 : 100}
      thickness={isTiny ? 4 : 8}
      startAngle={0}
      endAngle={360}
      value={Number(cpuUtilization.toFixed(2))}
      valueFormatter={(value) => `${value.toFixed(2)}%`}
      filledColor={progressColor(Number(cpuUtilization.toFixed(2)))}
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
