import { createIntegrationAsync } from "@homarr/integrations";
import type { KomodoOverview, KomodoServerOverviewItem } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

const CACHE_TTL_MS = 1_000;
const STALE_IF_ERROR_TTL_MS = 5 * 60_000;

export const komodoOverviewRequestHandler = createIntegrationRequestHandler<
  KomodoOverview,
  "komodo",
  Record<string, never>
>({
  cacheTtlMs: CACHE_TTL_MS,
  fallbackToStaleOnError: true,
  staleIfErrorTtlMs: STALE_IF_ERROR_TTL_MS,
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getOverviewAsync();
  },
});

export const komodoServerOverviewRequestHandler = createIntegrationRequestHandler<
  KomodoServerOverviewItem[],
  "komodo",
  Record<string, never>
>({
  cacheTtlMs: CACHE_TTL_MS,
  fallbackToStaleOnError: true,
  staleIfErrorTtlMs: STALE_IF_ERROR_TTL_MS,
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getServerOverviewAsync();
  },
});
