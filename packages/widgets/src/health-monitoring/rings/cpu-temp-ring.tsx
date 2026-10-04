import { Center, RingProgress, Text } from "@mantine/core";
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
    <RingProgress
      className="health-monitoring-cpu-temperature"
      aria-label={ariaLabel}
      roundCaps
      size={isTiny ? 50 : 100}
      thickness={isTiny ? 4 : 8}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- RingProgress renders the custom meter graphic.
      role="meter"
      aria-valuemin={CPU_TEMPERATURE_MIN_CELSIUS}
      aria-valuemax={CPU_TEMPERATURE_MAX_CELSIUS}
      aria-valuenow={normalizedCpuTemp}
      aria-valuetext={temperatureDisplay}
      sections={[{ value: normalizedCpuTemp, color: progressColor(normalizedCpuTemp) }]}
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
