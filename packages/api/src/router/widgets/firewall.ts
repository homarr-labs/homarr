import { z } from "zod/v4";

import { mockWidgetData } from "@homarr/integrations";
import {
  firewallCpuRequestHandler,
  firewallInterfacesRequestHandler,
  firewallMemoryRequestHandler,
  firewallVersionRequestHandler,
} from "@homarr/request-handler/firewall";
import { widgetRefreshIntervalSchema } from "@homarr/validation/widget-refresh-interval";

import { createManyWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const firewallMiddleware = createManyWidgetIntegrationMiddleware("query", "firewall");

type FirewallIntegration = Parameters<typeof firewallCpuRequestHandler.handler>[0];

interface FirewallHandler<TData> {
  handler: (
    integration: FirewallIntegration,
    input: Record<string, never>,
  ) => { getDataAsync: (options: { maxAgeMs?: number }) => Promise<{ data: TData; timestamp: Date }> };
}

interface FirewallQueryResult<TData> {
  integration: {
    id: string;
    name: string;
    kind: FirewallIntegration["kind"] | "mock";
    updatedAt: Date;
  };
  summary: TData;
  error: string | undefined;
}

const queryFirewall = <TData>(handler: FirewallHandler<TData>, createFallback: () => TData, getMockData: () => TData) =>
  publicProcedure
    .concat(firewallMiddleware)
    .input(z.object({ refreshInterval: widgetRefreshIntervalSchema.default(10) }))
    .query(async ({ ctx, input }) =>
      settleIntegrationQueries(
        ctx.integrations,
        async (integration): Promise<FirewallQueryResult<TData>> => {
          const { kind } = integration;
          if (kind === "mock") {
            return {
              integration: {
                id: integration.id,
                name: integration.name,
                kind,
                updatedAt: new Date(mockWidgetData.timestamp),
              },
              summary: getMockData(),
              error: undefined,
            };
          }
          const { data, timestamp } = await handler
            .handler({ ...integration, kind }, {})
            .getDataAsync({ maxAgeMs: input.refreshInterval * 1000 });
          return {
            integration: { id: integration.id, name: integration.name, kind: integration.kind, updatedAt: timestamp },
            summary: data,
            error: undefined,
          };
        },
        {
          fallback: (integration, error): FirewallQueryResult<TData> => ({
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
