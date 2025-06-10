import dayjs from "dayjs";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { FirewallSummary } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const firewallRequestHandler = createCachedIntegrationRequestHandler<
  FirewallSummary,
  IntegrationKindByCategory<"firewall">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getFirewallSummaryAsync();
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "firewallSummary",
});
