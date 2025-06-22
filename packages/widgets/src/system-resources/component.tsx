"use client";

import { useEffect, useState } from "react";
import { useElementSize, useListState } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { CombinedNetworkTrafficChart } from "./chart/combined-network-traffic";
import { SystemResourceCPUChart } from "./chart/cpu-chart";
import { SystemResourceMemoryChart } from "./chart/memory-chart";
import { NetworkTrafficChart } from "./chart/network-traffic";
import classes from "./component.module.css";

const MAX_QUEUE_SIZE = 15;

export default function SystemResources({ integrationIds }: WidgetComponentProps<"systemResources">) {
  const [queue, queueHandlers] = useListState<{
    cpu: number;
    memory: number;
    network: { up: number; down: number } | null;
  }>([]);
  const [memoryCapacityInBytes, setMemoryCapacityInBytes] = useState(0);

  const { ref, width } = useElementSize();

  const { data } = clientApi.widget.healthMonitoring.getSystemHealthStatus.useQuery({
    integrationIds,
  });
  clientApi.widget.healthMonitoring.subscribeSystemHealthStatus.useSubscription(
    {
      integrationIds,
    },
    {
      onData(data) {
        const obj = {
          cpu: data.healthInfo.cpuUtilization,
          memory: data.healthInfo.memUsedInBytes,
          network: data.healthInfo.network,
        };
        queueHandlers.setState((queue) => [...queue, obj].slice(0, MAX_QUEUE_SIZE));
      },
    },
  );

  const showNetwork = queue.length === 0 || queue.every((item) => item.network !== null);

  useEffect(() => {
    if (!data) {
      return;
    }

    const items = data.map((itemData) => ({
      cpu: itemData.healthInfo.cpuUtilization,
      memory: itemData.healthInfo.memUsedInBytes,
      network: itemData.healthInfo.network,
    }));
    queueHandlers.setState((queue) => [...queue, ...items].slice(0, MAX_QUEUE_SIZE));

    if (data[0]) {
      setMemoryCapacityInBytes(data[0].healthInfo.memAvailableInBytes + data[0].healthInfo.memUsedInBytes);
    }
  }, [data, queueHandlers.setState]);

  return (
    <div ref={ref} className={classes.grid}>
      <div className={classes.colSpanWide}>
        <SystemResourceCPUChart cpuUsageOverTime={queue.map((item) => item.cpu)} />
      </div>
      <div className={classes.colSpanWide}>
        <SystemResourceMemoryChart
          memoryUsageOverTime={queue.map((item) => item.memory)}
          totalCapacityInBytes={memoryCapacityInBytes}
        />
      </div>
      {showNetwork &&
        (width > 200 ? (
          <>
            {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
            <NetworkTrafficChart usageOverTime={queue.map((item) => item.network!.down)} isUp={false} />

            {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
            <NetworkTrafficChart usageOverTime={queue.map((item) => item.network!.up)} isUp />
          </>
        ) : (
          <div className={classes.colSpanWide}>
            {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
            <CombinedNetworkTrafficChart usageOverTime={queue.map((item) => item.network!)} />
          </div>
        ))}
    </div>
  );
}
