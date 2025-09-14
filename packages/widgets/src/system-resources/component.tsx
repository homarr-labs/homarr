"use client";

import { useState } from "react";
import { Box, Group, Stack } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { CombinedNetworkTrafficChart } from "./chart/combined-network-traffic";
import { SystemResourceCPUChart } from "./chart/cpu-chart";
import { SystemResourceMemoryChart } from "./chart/memory-chart";
import { NetworkTrafficChart } from "./chart/network-traffic";

const MAX_QUEUE_SIZE = 15;

export default function SystemResources({ integrationIds, options }: WidgetComponentProps<"systemResources">) {
  const { ref, width } = useElementSize();

  const [data] = clientApi.widget.healthMonitoring.getSystemHealthStatus.useSuspenseQuery({
    integrationIds,
  });
  const memoryCapacityInBytes =
    (data[0]?.healthInfo.memAvailableInBytes ?? 0) + (data[0]?.healthInfo.memUsedInBytes ?? 0);
  const [items, setItems] = useState<{ cpu: number; memory: number; network: { up: number; down: number } | null }[]>(
    data.map((item) => ({
      cpu: item.healthInfo.cpuUtilization,
      memory: item.healthInfo.memUsedInBytes,
      network: item.healthInfo.network,
    })),
  );

  clientApi.widget.healthMonitoring.subscribeSystemHealthStatus.useSubscription(
    {
      integrationIds,
    },
    {
      onData(data) {
        setItems((previousItems) => {
          const next = {
            cpu: data.healthInfo.cpuUtilization,
            memory: data.healthInfo.memUsedInBytes,
            network: data.healthInfo.network,
          };

          return [...previousItems, next].slice(-MAX_QUEUE_SIZE);
        });
      },
    },
  );

  const showNetwork =
    items.length === 0 || (items.every((item) => item.network !== null) && options.visibleCharts.includes("network"));
  const rowHeight = `calc((100% - ${(options.visibleCharts.length - 1) * 8}px) / ${options.visibleCharts.length})`;

  return (
    <Stack gap="xs" p="xs" ref={ref} h="100%">
      {options.visibleCharts.includes("cpu") && (
        <Box h={rowHeight}>
          <SystemResourceCPUChart cpuUsageOverTime={items.map((item) => item.cpu)} />
        </Box>
      )}
      {options.visibleCharts.includes("memory") && (
        <Box h={rowHeight}>
          <SystemResourceMemoryChart
            memoryUsageOverTime={items.map((item) => item.memory)}
            totalCapacityInBytes={memoryCapacityInBytes}
          />
        </Box>
      )}
      {showNetwork &&
        (width > 256 ? (
          <Group h={rowHeight} gap="xs" grow>
            {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
            <NetworkTrafficChart usageOverTime={items.map((item) => item.network!.down)} isUp={false} />

            {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
            <NetworkTrafficChart usageOverTime={items.map((item) => item.network!.up)} isUp />
          </Group>
        ) : (
          <Box h={rowHeight}>
            {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
            <CombinedNetworkTrafficChart usageOverTime={items.map((item) => item.network!)} />
          </Box>
        ))}
    </Stack>
  );
}
