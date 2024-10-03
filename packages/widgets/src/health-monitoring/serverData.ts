"use server";

import { api } from "@homarr/api/server";
import type { HealthMonitoring } from "@homarr/integrations";

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
      initialData: currentHealthInfo.filter(
        (
          health,
        ): health is {
          integrationId: string;
          integrationName: string;
          healthInfo: HealthMonitoring;
          timestamp: Date;
        } => health.healthInfo !== null,
      ),
    };
  } catch {
    return {
      initialData: [],
    };
  }
}
