import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type {
  FirewallCpuSummary,
  FirewallInterfacesSummary,
  FirewallMemorySummary,
  FirewallVersionSummary,
} from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const firewallCpuRequestHandler = createIntegrationRequestHandler<
  FirewallCpuSummary,
  IntegrationKindByCategory<"firewall">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return integrationInstance.getFirewallCpuAsync();
  },
});

export const firewallMemoryRequestHandler = createIntegrationRequestHandler<
  FirewallMemorySummary,
  IntegrationKindByCategory<"firewall">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getFirewallMemoryAsync();
  },
});

export const firewallInterfacesRequestHandler = createIntegrationRequestHandler<
  FirewallInterfacesSummary[],
  IntegrationKindByCategory<"firewall">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getFirewallInterfacesAsync();
  },
});

export const firewallVersionRequestHandler = createIntegrationRequestHandler<
  FirewallVersionSummary,
  IntegrationKindByCategory<"firewall">,
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getFirewallVersionAsync();
  },
});
