"use server";

import { api } from "@homarr/api/server";

import type { WidgetProps } from "../definition";

export default async function getServerDataAsync({ integrationIds }: WidgetProps<"hardwareUsage">) {
  if (integrationIds.length === 0) {
    return {
      initialData: {
        hardwareInformationHistory: {
          cpuLoad: [],
          memoryLoad: [],
          networkLoad: []
        }
      },
    };
  }

  const hardwareInformationHistory = await api.widget.hardwareUsage.getHardwareInformationHistory({
    integrationId: integrationIds[0],
  });

  return {
    initialData: {
      hardwareInformationHistory: hardwareInformationHistory
    },
  };
}
