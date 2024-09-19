"use server";

import { api } from "@homarr/api/server";
import { CpuLoad, MemoryLoad, NetworkLoad, ServerInfo } from "@homarr/integrations";

import type { WidgetProps } from "../definition";

export default async function getServerDataAsync({ integrationIds }: WidgetProps<"hardwareUsage">) {
  if (integrationIds.length === 0) {
    return {
      initialData: {
        hardwareInformationHistory: {
          cpuLoad: {} as CpuLoad,
          memoryLoad: {} as MemoryLoad,
          networkLoad: {} as NetworkLoad
        },
        serverInfo: {} as ServerInfo
      },
    };
  }

  const hardwareInformationHistory = await api.widget.hardwareUsage.getHardwareInformationHistory({
    integrationId: integrationIds[0] ?? "",
  });

  const serverInfo = await api.widget.hardwareUsage.getServerInfo({
    integrationId: integrationIds[0] ?? "",
  });

  return {
    initialData: {
      hardwareInformationHistory: hardwareInformationHistory,
      serverInfo
    },
  };
}
