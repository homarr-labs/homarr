"use server";

import { api } from "@homarr/api/server";

import type { WidgetProps } from "../definition";

export default async function getServerDataAsync({ integrationIds }: WidgetProps<"healthMonitoring">) {
  if (integrationIds.length === 0) {
    return {
      initialData: [],
    };
  }

  try {
    const currentHealthInfo = await api.widget.healthMonitoring.getHealthStatus({
      integrationIds,
    });

    return {
      initialData: currentHealthInfo,
    };
  } catch {
    return {
      initialData: [],
    };
  }
}
