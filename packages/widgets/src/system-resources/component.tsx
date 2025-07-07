"use client";

import { useEffect, useState } from "react";
import { useListState } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { SystemResourceCPUChart } from "./chart/cpu-chart";
import { SystemResourceMemoryChart } from "./chart/memory-chart";
import classes from "./component.module.css";
import {NetworkTrafficChart} from "./chart/network-traffic";

const MAX_QUEUE_SIZE = 15;

export default function SystemResources({ integrationIds }: WidgetComponentProps<"systemResources">) {
  const [queue, queueHandlers] = useListState<{ cpu: number; memory: number, network: { up: number, down: number } }>([]);
  const [memoryCapacityInBytes, setMemoryCapacityInBytes] = useState(0);

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
        queueHandlers.setState(queue => [...queue, obj].slice(0, MAX_QUEUE_SIZE));
      },
    },
  );

  useEffect(() => {
    if (!data) {
      return;
    }

    const items = data.map((d) => ({
      cpu: d.healthInfo.cpuUtilization,
      memory: d.healthInfo.memUsedInBytes,
      network: d.healthInfo.network,
    }));
    queueHandlers.setState(queue => [...queue, ...items].slice(0, MAX_QUEUE_SIZE));

    if (data[0]) {
      setMemoryCapacityInBytes(data[0].healthInfo.memAvailableInBytes + data[0].healthInfo.memUsedInBytes);
    }
  }, [data]);

  return (
    <div className={classes.grid}>
      <div className={classes.colSpanWide}>
        <SystemResourceCPUChart cpuUsageOverTime={queue.map((item) => item.cpu)} />
      </div>
      <div className={classes.colSpanWide}>
        <SystemResourceMemoryChart memoryUsageOverTime={queue.map((item) => item.memory)} totalCapacityInBytes={memoryCapacityInBytes} />
      </div>
      <NetworkTrafficChart usageOverTime={queue.map((item) => item.network.down)} isUp={false} />
      <NetworkTrafficChart usageOverTime={queue.map((item) => item.network.up)} isUp={true} />
      <div>
        Queue: {queue.length}
      </div>
    </div>
  );
}
