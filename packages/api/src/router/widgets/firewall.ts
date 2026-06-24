import { getIntegrationKindsByCategory } from "@homarr/definitions";
import {
  firewallCpuRequestHandler,
  firewallInterfacesRequestHandler,
  firewallMemoryRequestHandler,
  firewallVersionRequestHandler,
} from "@homarr/request-handler/firewall";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const firewallRouter = createTRPCRouter({
  getFirewallCpuStatus: publicProcedure
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("firewall")))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = firewallCpuRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getDataAsync();

          return {
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
              updatedAt: timestamp,
            },
            summary: data,
          };
        }),
      );
      return results;
    }),

  getFirewallInterfacesStatus: publicProcedure
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("firewall")))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = firewallInterfacesRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getDataAsync();

          return {
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
              updatedAt: timestamp,
            },
            summary: data,
          };
        }),
      );
      return results;
    }),

  getFirewallVersionStatus: publicProcedure
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("firewall")))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = firewallVersionRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getDataAsync();

          return {
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
              updatedAt: timestamp,
            },
            summary: data,
          };
        }),
      );
      return results;
    }),

  getFirewallMemoryStatus: publicProcedure
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("firewall")))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = firewallMemoryRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getDataAsync();

          return {
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
              updatedAt: timestamp,
            },
            summary: data,
          };
        }),
      );
      return results;
    }),
});
