import { Center, RingProgress, Text, Tooltip } from "@mantine/core";
import { IconBrain } from "@tabler/icons-react";

import { useByteFormatter } from "@homarr/settings";
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
  const { formatBytes, formatBytesPair } = useByteFormatter();
  const memoryUsage = formatMemoryUsage(available, used, formatBytes, formatBytesPair);

  const percentage = Math.max(0, Math.min(100, Number(memoryUsage.memUsed.percent)));

  return (
    <Tooltip label={`${memoryUsage.memUsed.percent}%`}>
      <RingProgress
        className="health-monitoring-memory"
        aria-label={ariaLabel}
        roundCaps
        size={isTiny ? 50 : 100}
        thickness={isTiny ? 4 : 8}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- RingProgress renders the custom meter graphic.
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-valuetext={`${percentage}%`}
        sections={[{ value: percentage, color: progressColor(percentage) }]}
        label={
          <Center style={{ flexDirection: "column" }}>
            <Text className="health-monitoring-memory-value" size={isTiny ? "8px" : "xs"}>
              {memoryUsage.memUsed.formatted}
            </Text>
            <IconBrain className="health-monitoring-memory-icon" style={zoomCompensatedSize(isTiny ? 8 : 16)} />
          </Center>
        }
      />
    </Tooltip>
  );
};

export const formatMemoryUsage = (
  memFree: number,
  memUsed: number,
  formatBytes: (bytes: number) => string,
  formatBytesPair: (used: number, total: number) => { used: string; total: string },
) => {
  const totalMemory = memFree + memUsed;
  const memFreePercent = Math.round((memFree / totalMemory) * 100);
  const memUsedPercent = Math.round((memUsed / totalMemory) * 100);
  const { used: formattedFree, total: formattedTotal } = formatBytesPair(memFree, totalMemory);

  return {
    memFree: { percent: memFreePercent, formatted: formattedFree },
    memUsed: { percent: memUsedPercent, formatted: formatBytes(memUsed) },
    memTotal: { formatted: formattedTotal },
  };
};
