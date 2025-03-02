import { Box, Center, RingProgress, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconCpu } from "@tabler/icons-react";

import { progressColor } from "../system-health";

export const CpuRing = ({ cpuUtilization }: { cpuUtilization: number }) => {
  const { width, ref } = useElementSize();
  const fallbackWidth = width || 1; // See https://github.com/homarr-labs/homarr/issues/2196

  return (
    <Box ref={ref} w="100%" h="100%" className="health-monitoring-cpu">
      <RingProgress
        className="health-monitoring-cpu-utilization"
        roundCaps
        size={fallbackWidth * 0.95}
        thickness={fallbackWidth / 10}
        label={
          <Center style={{ flexDirection: "column" }}>
            <Text className="health-monitoring-cpu-utilization-value" size="sm">{`${cpuUtilization.toFixed(2)}%`}</Text>
            <IconCpu className="health-monitoring-cpu-utilization-icon" size={30} />
          </Center>
        }
        sections={[
          {
            value: Number(cpuUtilization.toFixed(2)),
            color: progressColor(Number(cpuUtilization.toFixed(2))),
          },
        ]}
      />
    </Box>
  );
};
