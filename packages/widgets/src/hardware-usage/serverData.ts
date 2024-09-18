"use server";

import { api } from "@homarr/api/server";
import { CpuLoad, MemoryLoad, NetworkLoad } from "@homarr/integrations";

import type { WidgetProps } from "../definition";

export default async function getServerDataAsync({ integrationIds }: WidgetProps<"hardwareUsage">) {
  if (integrationIds.length === 0) {
    return {
      initialData: {
        hardwareInformationHistory: {
          cpuLoad: {} as CpuLoad,
          memoryLoad: {} as MemoryLoad,
          networkLoad: {} as NetworkLoad,
        },
      },
    };
  }

  const hardwareInformationHistory = await api.widget.hardwareUsage.getHardwareInformationHistory({
    integrationId: integrationIds[0] ?? "",
  });

  return {
    initialData: {
      hardwareInformationHistory: hardwareInformationHistory,
    },
  };
}
