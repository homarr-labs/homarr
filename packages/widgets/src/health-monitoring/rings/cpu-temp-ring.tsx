import { Box, Center, RingProgress, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconCpu } from "@tabler/icons-react";

import { progressColor } from "../system-health";

export const CpuTempRing = ({ fahrenheit, cpuTemp }: { fahrenheit: boolean; cpuTemp: number | undefined }) => {
  const { width, ref } = useElementSize();
  const fallbackWidth = width || 1; // See https://github.com/homarr-labs/homarr/issues/2196

  if (!cpuTemp) {
    return null;
  }

  return (
    <Box ref={ref} w="100%" h="100%" className="health-monitoring-cpu-temperature">
      <RingProgress
        className="health-monitoring-cpu-temp"
        roundCaps
        size={fallbackWidth * 0.95}
        thickness={fallbackWidth / 10}
        label={
          <Center style={{ flexDirection: "column" }}>
            <Text className="health-monitoring-cpu-temp-value" size="sm">
              {fahrenheit ? `${(cpuTemp * 1.8 + 32).toFixed(1)}°F` : `${cpuTemp.toFixed(1)}°C`}
            </Text>
            <IconCpu className="health-monitoring-cpu-temp-icon" size={30} />
          </Center>
        }
        sections={[
          {
            value: cpuTemp,
            color: progressColor(cpuTemp),
          },
        ]}
      />
    </Box>
  );
};
