import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import type {
  SmartHomeCatalog,
  SmartHomeForecastDay,
  SmartHomeHistorySeries,
  SmartHomeSnapshot,
} from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

type SmartHomeIntegrationKind = IntegrationKindByCategory<"smartHomeServer">;

export const smartHomeSnapshotRequestHandler = createIntegrationRequestHandler<
  SmartHomeSnapshot,
  SmartHomeIntegrationKind,
  { entityIds: string[]; areaIds: string[]; domains: string[]; excludedEntityIds?: string[] }
>({
  cacheNamespace: "smart-home:snapshot",
  cacheVersion: "v2",
  cacheTtlMs: 10_000,
  async requestAsync(integration, input) {
    const instance = await createIntegrationAsync(integration);
    return await instance.getSnapshotAsync(input);
  },
});

export const smartHomeCatalogRequestHandler = createIntegrationRequestHandler<
  SmartHomeCatalog,
  SmartHomeIntegrationKind,
  Record<string, never>
>({
  cacheNamespace: "smart-home:catalog",
  cacheVersion: "v1",
  cacheTtlMs: 15_000,
  fallbackToStaleOnError: true,
  async requestAsync(integration) {
    const instance = await createIntegrationAsync(integration);
    return await instance.getCatalogAsync();
  },
});

export const smartHomeHistoryRequestHandler = createIntegrationRequestHandler<
  SmartHomeHistorySeries[],
  SmartHomeIntegrationKind,
  { entityIds: string[]; hours: number; samples: number }
>({
  cacheNamespace: "smart-home:history",
  cacheVersion: "v1",
  cacheTtlMs: 5 * 60_000,
  async requestAsync(integration, input) {
    const instance = await createIntegrationAsync(integration);
    return await instance.getHistoryAsync(input.entityIds, input.hours, input.samples);
  },
});

export const smartHomeForecastRequestHandler = createIntegrationRequestHandler<
  SmartHomeForecastDay[],
  SmartHomeIntegrationKind,
  { entityId: string; type: "daily" | "hourly" }
>({
  cacheNamespace: "smart-home:forecast",
  cacheVersion: "v1",
  cacheTtlMs: 30 * 60_000,
  async requestAsync(integration, input) {
    const instance = await createIntegrationAsync(integration);
    return await instance.getForecastAsync(input.entityId, input.type);
  },
});
