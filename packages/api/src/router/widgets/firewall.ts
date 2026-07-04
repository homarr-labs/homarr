import { getIntegrationKindsByCategory } from "@homarr/definitions";
import {
  firewallCpuRequestHandler,
  firewallInterfacesRequestHandler,
  firewallMemoryRequestHandler,
  firewallVersionRequestHandler,
} from "@homarr/request-handler/firewall";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const firewallMiddleware = createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("firewall"));

const queryFirewall = <
  THandler extends {
    handler: (integration: any, input: any) => { getDataAsync: () => Promise<{ data: any; timestamp: Date }> };
  },
>(
  handler: THandler,
) =>
  publicProcedure.concat(firewallMiddleware).query(async ({ ctx }) =>
    settleIntegrationQueries(ctx.integrations, async (integration) => {
      const { data, timestamp } = await handler.handler(integration, {}).getDataAsync();
      return {
        integration: { id: integration.id, name: integration.name, kind: integration.kind, updatedAt: timestamp },
        summary: data as Awaited<ReturnType<ReturnType<THandler["handler"]>["getDataAsync"]>>["data"],
      };
    }),
  );

export const firewallRouter = createTRPCRouter({
  getFirewallCpuStatus: queryFirewall(firewallCpuRequestHandler),
  getFirewallInterfacesStatus: queryFirewall(firewallInterfacesRequestHandler),
  getFirewallVersionStatus: queryFirewall(firewallVersionRequestHandler),
  getFirewallMemoryStatus: queryFirewall(firewallMemoryRequestHandler),
});
