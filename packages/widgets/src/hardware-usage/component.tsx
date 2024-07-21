import { Stack } from "@mantine/core";
import { useListState } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
import type { CpuLoad, MemoryLoad, NetworkLoad } from "@homarr/integrations";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationSelectedError } from "../errors";
import { CpuGraph } from "./graphs/cpu-graph";
import { MemoryGraph } from "./graphs/memory-graph";
import { NetworkGraph } from "./graphs/network-graph";

export default function HardwareUsageWidget({ integrationIds }: WidgetComponentProps<"hardwareUsage">) {
  const [hardwareUsageHistory] = clientApi.widget.hardwareUsage.getHardwareInformationHistory.useSuspenseQuery(
    {
      integrationId: integrationIds[0] ?? "",
    },
    {},
  );

  const [serverInfo] = clientApi.widget.hardwareUsage.getServerInfo.useSuspenseQuery({
    integrationId: integrationIds[0] ?? "",
  });

  const [hardwareUsage, hardwareUsageHandlers] = useListState<{
    cpuLoad: CpuLoad;
    memoryLoad: MemoryLoad;
    networkLoad: NetworkLoad;
  }>([hardwareUsageHistory]);

  clientApi.widget.hardwareUsage.subscribeCpu.useSubscription(
    {
      integrationId: integrationIds[0] ?? "",
    },
    {
      onData: (data) => {
        hardwareUsageHandlers.append(data);
        if (hardwareUsage.length > 15) {
          hardwareUsageHandlers.shift();
        }
      },
    },
  );

  if (integrationIds.length != 1) {
    throw new NoIntegrationSelectedError();
  }

  const hasLast = hardwareUsage.length > 0;

  return (
    <Stack p={"md"}>
      <CpuGraph cpuLoad={hardwareUsage.map((usage) => usage.cpuLoad)} hasLast={hasLast} />
      <MemoryGraph
        memoryLoad={hardwareUsage.map((usage) => usage.memoryLoad)}
        maxAvailableBytes={serverInfo.info.maxAvailableMemoryBytes}
        hasLast={hasLast}
      />
      <NetworkGraph networkLoad={hardwareUsage.map((usage) => usage.networkLoad)} hasLast={hasLast} />
    </Stack>
  );
}
