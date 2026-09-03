import { GaugeChart } from "@mantine/charts";
import { Center, Text } from "@mantine/core";
import { IconCpu } from "@tabler/icons-react";

import { zoomCompensatedSize } from "@homarr/ui";

import { progressColor } from "../system-health";

const maxCpuTemperature = 100;

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
  if (cpuTemp === undefined) {
    return null;
  }

  const temperature = Math.min(Math.max(cpuTemp, 0), maxCpuTemperature);
  const temperatureDisplay = fahrenheit ? `${(temperature * 1.8 + 32).toFixed(1)}°F` : `${temperature.toFixed(1)}°C`;

  return (
    <GaugeChart
      className="health-monitoring-cpu-temperature"
      aria-label={ariaLabel}
      roundCaps
      size={isTiny ? 50 : 100}
      thickness={isTiny ? 4 : 8}
      startAngle={0}
      endAngle={360}
      value={temperature}
      max={maxCpuTemperature}
      valueFormatter={() => temperatureDisplay}
      filledColor={progressColor(temperature)}
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
