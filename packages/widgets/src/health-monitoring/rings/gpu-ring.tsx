import { Center, RingProgress, Stack, Text, Tooltip } from "@mantine/core";
import { IconDeviceDesktop } from "@tabler/icons-react";

import { progressColor } from "../system-health";

interface GpuRingProps {
  gpu: {
    gpuId: string;
    name: string;
    memoryUtilization: number;
    processorUtilization: number;
    temperature: number | null;
    fanSpeed: number | null;
  };
  isTiny: boolean;
  fahrenheit: boolean;
}

export const GpuRing = ({ gpu, isTiny, fahrenheit }: GpuRingProps) => {
  const tempDisplay =
    gpu.temperature != null
      ? fahrenheit
        ? `${(gpu.temperature * 1.8 + 32).toFixed(0)}°F`
        : `${gpu.temperature}°C`
      : null;

  return (
    <Tooltip
      label={
        <Stack gap={2}>
          <Text size="xs" fw={600}>
            {gpu.name}
          </Text>
          <Text size="xs">VRAM: {gpu.memoryUtilization.toFixed(1)}%</Text>
          {tempDisplay && <Text size="xs">Temp: {tempDisplay}</Text>}
          {gpu.fanSpeed != null && <Text size="xs">Fan: {gpu.fanSpeed} RPM</Text>}
        </Stack>
      }
      multiline
    >
      <RingProgress
        className={`health-monitoring-gpu health-monitoring-gpu-${gpu.gpuId}`}
        roundCaps
        size={isTiny ? 50 : 100}
        thickness={isTiny ? 4 : 8}
        label={
          <Center style={{ flexDirection: "column" }}>
            <Text
              className="health-monitoring-gpu-utilization-value"
              size={isTiny ? "8px" : "xs"}
            >{`${gpu.processorUtilization.toFixed(0)}%`}</Text>
            <IconDeviceDesktop className="health-monitoring-gpu-utilization-icon" size={isTiny ? 8 : 16} />
          </Center>
        }
        sections={[
          {
            value: Number(gpu.processorUtilization.toFixed(2)),
            color: progressColor(Number(gpu.processorUtilization.toFixed(2))),
          },
        ]}
      />
    </Tooltip>
  );
};
