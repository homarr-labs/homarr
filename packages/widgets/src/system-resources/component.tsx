"use client";

import { useEffect, useState } from "react";
import { useListState } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { SystemResourceCPUChart } from "./chart/cpu-chart";
import { SystemResourceMemoryChart } from "./chart/memory-chart";
import classes from "./component.module.css";

const MAX_QUEUE_SIZE = 15;

export default function SystemResources({ integrationIds }: WidgetComponentProps<"systemResources">) {
  const [queue, queueHandlers] = useListState<{ cpu: number; memory: number }>([]);
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
    }));
    queueHandlers.setState(queue => [...queue, ...items].slice(0, MAX_QUEUE_SIZE));

    if (data[0]) {
      setMemoryCapacityInBytes(data[0].healthInfo.memAvailableInBytes);
    }
  }, [data]);

  return (
    <div className={classes.grid}>
      <div className={classes.colSpanWide}>
        <SystemResourceCPUChart cpuUsageOverTime={queue.map((x) => x.cpu)} />
      </div>
      <div className={classes.colSpanWide}>
        <SystemResourceMemoryChart memoryUsageOverTime={queue.map((x) => x.memory)} totalCapacityInBytes={memoryCapacityInBytes} />
      </div>
      <SystemResourceMemoryChart memoryUsageOverTime={queue.map((x) => x.memory)} totalCapacityInBytes={memoryCapacityInBytes} />
      <SystemResourceMemoryChart memoryUsageOverTime={queue.map((x) => x.memory)} totalCapacityInBytes={memoryCapacityInBytes} />
      <div>
        Queue: {queue.length}
      </div>
    </div>
  );
}
