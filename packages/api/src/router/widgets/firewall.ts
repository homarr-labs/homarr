import {
  firewallCpuRequestHandler,
  firewallInterfacesRequestHandler,
  firewallMemoryRequestHandler,
  firewallVersionRequestHandler,
} from "@homarr/request-handler/firewall";

import { createManyWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const firewallMiddleware = createManyWidgetIntegrationMiddleware("query", "firewall");

const queryFirewall = <
  THandler extends {
    handler: (integration: any, input: any) => { getDataAsync: () => Promise<{ data: any; timestamp: Date }> };
  },
>(
  handler: THandler,
  createFallback: () => Awaited<ReturnType<ReturnType<THandler["handler"]>["getDataAsync"]>>["data"],
) =>
  publicProcedure.concat(firewallMiddleware).query(async ({ ctx }) =>
    settleIntegrationQueries(
      ctx.integrations,
      async (integration) => {
        const { data, timestamp } = await handler.handler(integration, {}).getDataAsync();
        return {
          integration: { id: integration.id, name: integration.name, kind: integration.kind, updatedAt: timestamp },
          summary: data as Awaited<ReturnType<ReturnType<THandler["handler"]>["getDataAsync"]>>["data"],
          error: undefined as string | undefined,
        };
      },
      {
        fallback: (integration, error) => ({
          integration: { id: integration.id, name: integration.name, kind: integration.kind, updatedAt: new Date(0) },
          summary: createFallback(),
          error: toPublicIntegrationError(error),
        }),
        throwOnAllFailures: true,
      },
    ),
  );

export const firewallRouter = createTRPCRouter({
  getFirewallCpuStatus: queryFirewall(firewallCpuRequestHandler, () => ({ total: 0 })),
  getFirewallInterfacesStatus: queryFirewall(firewallInterfacesRequestHandler, () => []),
  getFirewallVersionStatus: queryFirewall(firewallVersionRequestHandler, () => ({ version: "Unknown" })),
  getFirewallMemoryStatus: queryFirewall(firewallMemoryRequestHandler, () => ({ used: 0, total: 0, percent: 0 })),
});
