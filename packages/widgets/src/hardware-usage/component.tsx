import { Stack, Code } from "@mantine/core";
import { useListState } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
import type { CpuLoad, MemoryLoad, NetworkLoad } from "@homarr/integrations";

import { CpuGraph } from "./graphs/cpu-graph";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationSelectedError } from "../errors";
import { MemoryGraph } from "./graphs/memory-graph";

export default function HardwareUsageWidget({ serverData, integrationIds }: WidgetComponentProps<"hardwareUsage">) {
  const [hardwareUsage, hardwareUsageHandlers] = useListState<{
    cpuLoad: CpuLoad;
    memoryLoad: MemoryLoad;
    networkLoad: NetworkLoad;
  }>(serverData ? [serverData.initialData.hardwareInformationHistory] : []);

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
      <CpuGraph cpuLoad={hardwareUsage.map(usage => usage.cpuLoad)} hasLast={hasLast}/>
      <MemoryGraph memoryLoad={hardwareUsage.map(usage => usage.memoryLoad)} maxAvailableBytes={6000000000} hasLast={hasLast} />
      <Code block>{JSON.stringify(hardwareUsage[hardwareUsage.length - 1])}</Code>
      <Code block>{JSON.stringify(serverData?.initialData.serverInfo)}</Code>
    </Stack>
  );
}
