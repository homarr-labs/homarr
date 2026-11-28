import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { PfSenseIntegration } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import type {
  FirewallCpuSummary,
  FirewallInterfacesSummary,
  FirewallMemorySummary,
  FirewallVersionSummary,
} from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

const opnsenseCpuRequestHandler = createIntegrationRequestHandler<
  FirewallCpuSummary,
  "opnsense",
  Record<string, never>
>({
  cacheNamespace: "firewall:cpu",
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return integrationInstance.getFirewallCpuAsync();
  },
});

const opnsenseMemoryRequestHandler = createIntegrationRequestHandler<
  FirewallMemorySummary,
  "opnsense",
  Record<string, never>
>({
  cacheNamespace: "firewall:memory",
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getFirewallMemoryAsync();
  },
});

type PfSenseUsage = Awaited<ReturnType<PfSenseIntegration["getFirewallUsageAsync"]>>;

const pfSenseUsageRequestHandler = createIntegrationRequestHandler<PfSenseUsage, "pfsense", Record<string, never>>({
  cacheNamespace: "firewall:pfsense-usage",
  async requestAsync(integration) {
    const client = await createIntegrationAsync(integration);
    return await client.getFirewallUsageAsync();
  },
});

type FirewallIntegration = Omit<Parameters<typeof opnsenseCpuRequestHandler.handler>[0], "kind"> & {
  kind: IntegrationKindByCategory<"firewall">;
};

const withPfSenseUsage = <TMetric extends keyof PfSenseUsage>(
  metric: TMetric,
  opnsenseHandler: ReturnType<
    typeof createIntegrationRequestHandler<NonNullable<PfSenseUsage[TMetric]>, "opnsense", Record<string, never>>
  >,
) => ({
  handler({ kind, ...integration }: FirewallIntegration, input: Record<string, never>) {
    if (kind === "opnsense") return opnsenseHandler.handler({ ...integration, kind }, input);

    const request = pfSenseUsageRequestHandler.handler({ ...integration, kind }, input);
    return {
      async getDataAsync(options: { maxAgeMs?: number }) {
        const { data, timestamp } = await request.getDataAsync(options);
        return { data: data[metric], timestamp };
      },
    };
  },
});

export const firewallCpuRequestHandler = withPfSenseUsage("cpu", opnsenseCpuRequestHandler);
export const firewallMemoryRequestHandler = withPfSenseUsage("memory", opnsenseMemoryRequestHandler);

export const firewallInterfacesRequestHandler = createIntegrationRequestHandler<
  FirewallInterfacesSummary[],
  IntegrationKindByCategory<"firewall">,
  Record<string, never>
>({
  cacheNamespace: "firewall:interfaces",
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
  cacheNamespace: "firewall:version",
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getFirewallVersionAsync();
  },
});
