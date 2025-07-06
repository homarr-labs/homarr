"use client";

import { useEffect } from "react";
import { useQueue } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { SystemResourceCPUChart } from "./chart/cpu-chart";
import { SystemResourceMemoryChart } from "./chart/memory-chart";
import classes from "./component.module.css";

export default function SystemResources({ integrationIds }: WidgetComponentProps<"systemResources">) {
  const { queue, add } = useQueue<{ cpu: number; memory: number }>({
    limit: 30,
  });

  const { data } = clientApi.widget.healthMonitoring.getSystemHealthStatus.useQuery({
    integrationIds,
  });
  clientApi.widget.healthMonitoring.subscribeSystemHealthStatus.useSubscription(
    {
      integrationIds,
    },
    {
      onData(data) {
        console.log('new data', data);
        add({
          cpu: data.healthInfo.cpuUtilization,
          memory: data.healthInfo.memUsedInBytes,
        });
      },
    },
  );

  useEffect(() => {
    if (!data) {
      return;
    }

    add(
      ...data.map((d) => ({
        cpu: d.healthInfo.cpuUtilization,
        memory: d.healthInfo.memUsedInBytes,
      })),
    );
  }, [data]);

  return (
    <div className={classes.grid}>
      <div className={classes.colSpanWide}>
        <SystemResourceCPUChart cpuUsageOverTime={queue.map((x) => x.cpu)} />
      </div>
      <div className={classes.colSpanWide}>
        <SystemResourceMemoryChart memoryUsageOverTime={queue.map((x) => x.memory)} />
      </div>
      <SystemResourceMemoryChart memoryUsageOverTime={queue.map((x) => x.memory)} />
      <SystemResourceMemoryChart memoryUsageOverTime={queue.map((x) => x.memory)} />
    </div>
  );
}
