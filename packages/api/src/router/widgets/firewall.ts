import { getIntegrationKindsByCategory } from "@homarr/definitions";
import type { IntegrationKind } from "@homarr/definitions";
import { mockWidgetData } from "@homarr/integrations";
import {
  firewallCpuRequestHandler,
  firewallInterfacesRequestHandler,
  firewallMemoryRequestHandler,
  firewallVersionRequestHandler,
} from "@homarr/request-handler/firewall";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const firewallMiddleware = createManyIntegrationMiddleware(
  "query",
  ...getIntegrationKindsByCategory("firewall"),
  "mock",
);

interface FirewallResult<TSummary> {
  integration: { id: string; name: string; kind: IntegrationKind; updatedAt: Date };
  summary: TSummary;
  error?: string;
}

const queryFirewall = <TSummary>(
  handler: {
    handler: (
      integration: any,
      input: Record<string, never>,
    ) => { getDataAsync: () => Promise<{ data: TSummary; timestamp: Date }> };
  },
  createFallback: () => TSummary,
  getMockData: () => TSummary,
) =>
  publicProcedure.concat(firewallMiddleware).query(async ({ ctx }) =>
    settleIntegrationQueries(
      ctx.integrations,
      async (integration): Promise<FirewallResult<TSummary>> => {
        if (integration.kind === "mock") {
          return {
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
              updatedAt: new Date(mockWidgetData.timestamp),
            },
            summary: getMockData(),
            error: undefined,
          };
        }
        const { data, timestamp } = await handler.handler({ ...integration, kind: "opnsense" }, {}).getDataAsync();
        return {
          integration: { id: integration.id, name: integration.name, kind: integration.kind, updatedAt: timestamp },
          summary: data,
          error: undefined,
        };
      },
      {
        fallback: (integration, error): FirewallResult<TSummary> => ({
          integration: { id: integration.id, name: integration.name, kind: integration.kind, updatedAt: new Date(0) },
          summary: createFallback(),
          error: toPublicIntegrationError(error),
        }),
        throwOnAllFailures: true,
      },
    ),
  );

export const firewallRouter = createTRPCRouter({
  getFirewallCpuStatus: queryFirewall(
    firewallCpuRequestHandler,
    () => ({ total: 0 }),
    () => mockWidgetData.firewallCpu,
  ),
  getFirewallInterfacesStatus: queryFirewall(
    firewallInterfacesRequestHandler,
    () => [],
    () => mockWidgetData.firewallInterfaces,
  ),
  getFirewallVersionStatus: queryFirewall(
    firewallVersionRequestHandler,
    () => ({ version: "Unknown" }),
    () => mockWidgetData.firewallVersion,
  ),
  getFirewallMemoryStatus: queryFirewall(
    firewallMemoryRequestHandler,
    () => ({ used: 0, total: 0, percent: 0 }),
    () => mockWidgetData.firewallMemory,
  ),
});
