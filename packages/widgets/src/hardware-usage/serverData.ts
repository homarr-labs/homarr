"use server";

import { api } from "@homarr/api/server";

import type { WidgetProps } from "../definition";

export default async function getServerDataAsync({ integrationIds }: WidgetProps<"hardwareUsage">) {
  if (integrationIds.length === 0) {
    return {
      initialData: [],
    };
  }

  const cpuHistory = await api.widget.hardwareUsage.getCpuHistory({
    integrationIds,
  });

  return {
    initialData: {
      cpuHistory: cpuHistory
    },
  };
}
