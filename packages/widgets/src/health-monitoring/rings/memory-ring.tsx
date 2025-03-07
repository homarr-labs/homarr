import { Box, Center, RingProgress, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconBrain } from "@tabler/icons-react";

import { progressColor } from "../system-health";

export const MemoryRing = ({ available, used }: { available: string; used: string }) => {
  const { width, ref } = useElementSize();
  const fallbackWidth = width || 1; // See https://github.com/homarr-labs/homarr/issues/2196
  const memoryUsage = formatMemoryUsage(available, used);

  return (
    <Box ref={ref} w="100%" h="100%" className="health-monitoring-memory">
      <RingProgress
        className="health-monitoring-memory-use"
        roundCaps
        size={fallbackWidth * 0.95}
        thickness={fallbackWidth / 10}
        label={
          <Center style={{ flexDirection: "column" }}>
            <Text className="health-monitoring-memory-value" size="sm">
              {memoryUsage.memUsed.GB}GiB
            </Text>
            <IconBrain className="health-monitoring-memory-icon" size={30} />
          </Center>
        }
        sections={[
          {
            value: Number(memoryUsage.memUsed.percent),
            color: progressColor(Number(memoryUsage.memUsed.percent)),
            tooltip: `${memoryUsage.memUsed.percent}%`,
          },
        ]}
      />
    </Box>
  );
};

export const formatMemoryUsage = (memFree: string, memUsed: string) => {
  const memFreeBytes = Number(memFree);
  const memUsedBytes = Number(memUsed);
  const totalMemory = memFreeBytes + memUsedBytes;
  const memFreeGB = (memFreeBytes / 1024 ** 3).toFixed(2);
  const memUsedGB = (memUsedBytes / 1024 ** 3).toFixed(2);
  const memFreePercent = Math.round((memFreeBytes / totalMemory) * 100);
  const memUsedPercent = Math.round((memUsedBytes / totalMemory) * 100);
  const memTotalGB = (totalMemory / 1024 ** 3).toFixed(2);

  return {
    memFree: { percent: memFreePercent, GB: memFreeGB },
    memUsed: { percent: memUsedPercent, GB: memUsedGB },
    memTotal: { GB: memTotalGB },
  };
};
