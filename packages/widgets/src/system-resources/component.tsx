"use client";

import { useState } from "react";
import { useElementSize } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { CombinedNetworkTrafficChart } from "./chart/combined-network-traffic";
import { SystemResourceCPUChart } from "./chart/cpu-chart";
import { SystemResourceMemoryChart } from "./chart/memory-chart";
import { NetworkTrafficChart } from "./chart/network-traffic";
import classes from "./component.module.css";

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

  const showNetwork = items.length === 0 || items.every((item) => item.network !== null);

  return (
    <div ref={ref} className={classes.grid}>
      <div className={classes.colSpanWide}>
        <SystemResourceCPUChart cpuUsageOverTime={items.map((item) => item.cpu)} hasShadow={options.hasShadow} />
      </div>
      <div className={classes.colSpanWide}>
        <SystemResourceMemoryChart
          memoryUsageOverTime={items.map((item) => item.memory)}
          totalCapacityInBytes={memoryCapacityInBytes}
          hasShadow={options.hasShadow}
        />
      </div>
      {showNetwork &&
        (width > 200 ? (
          <>
            <NetworkTrafficChart
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              usageOverTime={items.map((item) => item.network!.down)}
              isUp={false}
              hasShadow={options.hasShadow}
            />

            <NetworkTrafficChart
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              usageOverTime={items.map((item) => item.network!.up)}
              isUp
              hasShadow={options.hasShadow}
            />
          </>
        ) : (
          <div className={classes.colSpanWide}>
            <CombinedNetworkTrafficChart
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              usageOverTime={items.map((item) => item.network!)}
              hasShadow={options.hasShadow}
            />
          </div>
        ))}
    </div>
  );
}
