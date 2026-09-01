import { GaugeChart } from "@mantine/charts";
import { Center, Text } from "@mantine/core";
import { IconCpu } from "@tabler/icons-react";

import { zoomCompensatedSize } from "@homarr/ui";

import { progressColor } from "../system-health";

export const CpuTempRing = ({
  fahrenheit,
  cpuTemp,
  isTiny,
  ariaLabel,
}: {
  fahrenheit: boolean;
  cpuTemp: number | undefined;
  isTiny: boolean;
  ariaLabel: string;
}) => {
  if (!cpuTemp) {
    return null;
  }

  const temperatureDisplay = fahrenheit ? `${(cpuTemp * 1.8 + 32).toFixed(1)}°F` : `${cpuTemp.toFixed(1)}°C`;

  return (
    <GaugeChart
      className="health-monitoring-cpu-temperature"
      aria-label={ariaLabel}
      roundCaps
      size={isTiny ? 50 : 100}
      thickness={isTiny ? 4 : 8}
      startAngle={0}
      endAngle={360}
      value={cpuTemp}
      valueFormatter={() => temperatureDisplay}
      filledColor={progressColor(cpuTemp)}
      label={
        <Center style={{ flexDirection: "column" }}>
          <Text className="health-monitoring-cpu-temp-value" size={isTiny ? "8px" : "xs"}>
            {temperatureDisplay}
          </Text>
          <IconCpu className="health-monitoring-cpu-temp-icon" style={zoomCompensatedSize(isTiny ? 8 : 16)} />
        </Center>
      }
    />
  );
};
