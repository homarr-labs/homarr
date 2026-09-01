import { GaugeChart } from "@mantine/charts";
import { Center, Text, Tooltip } from "@mantine/core";
import { IconBrain } from "@tabler/icons-react";

import { zoomCompensatedSize } from "@homarr/ui";

import { progressColor } from "../system-health";

export const MemoryRing = ({
  available,
  used,
  isTiny,
  ariaLabel,
}: {
  available: number;
  used: number;
  isTiny: boolean;
  ariaLabel: string;
}) => {
  const memoryUsage = formatMemoryUsage(available, used);

  return (
    <Tooltip label={`${memoryUsage.memUsed.percent}%`}>
      <GaugeChart
        className="health-monitoring-memory"
        aria-label={ariaLabel}
        roundCaps
        size={isTiny ? 50 : 100}
        thickness={isTiny ? 4 : 8}
        startAngle={0}
        endAngle={360}
        value={Number(memoryUsage.memUsed.percent)}
        valueFormatter={(value) => `${value}%`}
        filledColor={progressColor(Number(memoryUsage.memUsed.percent))}
        label={
          <Center style={{ flexDirection: "column" }}>
            <Text className="health-monitoring-memory-value" size={isTiny ? "8px" : "xs"}>
              {memoryUsage.memUsed.GB}GiB
            </Text>
            <IconBrain className="health-monitoring-memory-icon" style={zoomCompensatedSize(isTiny ? 8 : 16)} />
          </Center>
        }
      />
    </Tooltip>
  );
};

export const formatMemoryUsage = (memFree: number, memUsed: number) => {
  const totalMemory = memFree + memUsed;
  const memFreeGB = (memFree / 1024 ** 3).toFixed(2);
  const memUsedGB = (memUsed / 1024 ** 3).toFixed(2);
  const memFreePercent = Math.round((memFree / totalMemory) * 100);
  const memUsedPercent = Math.round((memUsed / totalMemory) * 100);
  const memTotalGB = (totalMemory / 1024 ** 3).toFixed(2);

  return {
    memFree: { percent: memFreePercent, GB: memFreeGB },
    memUsed: { percent: memUsedPercent, GB: memUsedGB },
    memTotal: { GB: memTotalGB },
  };
};
