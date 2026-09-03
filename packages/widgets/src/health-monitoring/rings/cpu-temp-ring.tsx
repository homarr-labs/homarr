import { GaugeChart } from "@mantine/charts";
import { Center, Text } from "@mantine/core";
import { IconCpu } from "@tabler/icons-react";

import { zoomCompensatedSize } from "@homarr/ui";

import { progressColor } from "../system-health";

const CPU_TEMPERATURE_MIN_CELSIUS = 0;
const CPU_TEMPERATURE_MAX_CELSIUS = 100;

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

  const normalizedCpuTemp = Math.max(CPU_TEMPERATURE_MIN_CELSIUS, Math.min(CPU_TEMPERATURE_MAX_CELSIUS, cpuTemp));
  const formatTemperature = (value: number) =>
    fahrenheit ? `${(value * 1.8 + 32).toFixed(1)}°F` : `${value.toFixed(1)}°C`;
  const temperatureDisplay = formatTemperature(normalizedCpuTemp);

  return (
    <GaugeChart
      className="health-monitoring-cpu-temperature"
      aria-label={ariaLabel}
      roundCaps
      size={isTiny ? 50 : 100}
      thickness={isTiny ? 4 : 8}
      startAngle={0}
      endAngle={360}
      min={CPU_TEMPERATURE_MIN_CELSIUS}
      max={CPU_TEMPERATURE_MAX_CELSIUS}
      value={normalizedCpuTemp}
      valueFormatter={formatTemperature}
      filledColor={progressColor(normalizedCpuTemp)}
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
