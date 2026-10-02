import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { DnsHoleSummary } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const dnsHoleRequestHandler = createIntegrationRequestHandler<
  DnsHoleSummary,
  IntegrationKindByCategory<"dnsHole">,
  Record<string, never>
>({
  cacheNamespace: "dns-hole:summary",
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getSummaryAsync();
  },
});
