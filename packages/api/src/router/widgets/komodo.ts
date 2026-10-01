import {
  komodoContainersRequestHandler,
  komodoOverviewRequestHandler,
  komodoServerOverviewRequestHandler,
} from "@homarr/request-handler/komodo";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const komodoRouter = createTRPCRouter({
  getContainers: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "List Docker containers visible through a Komodo integration, including server, state, image, CPU, and memory data. REQUIRED: integrationId from integration_all. The caller needs query permission for that integration.",
      },
    })
    .concat(createOneIntegrationMiddleware("query", "komodo"))
    .query(async ({ ctx }) => {
      const handler = komodoContainersRequestHandler.handler(ctx.integration, {});
      const { data, timestamp } = await handler.getDataAsync();

      return {
        containers: data,
        timestamp,
      };
    }),
  getOverview: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get summary counts and problem resources for servers, stacks, and deployments from a Komodo integration. REQUIRED: integrationId from integration_all. The caller needs query permission for that integration.",
      },
    })
    .concat(createOneIntegrationMiddleware("query", "komodo"))
    .query(async ({ ctx }) => {
      const handler = komodoOverviewRequestHandler.handler(ctx.integration, {});
      const { data, timestamp } = await handler.getDataAsync();

      return {
        overview: data,
        updatedAt: timestamp,
      };
    }),
  getServers: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get Komodo server status and live CPU, memory, disk, load, network throughput, core count, and Periphery version data. REQUIRED: integrationId from integration_all. The caller needs query permission for that integration.",
      },
    })
    .concat(createOneIntegrationMiddleware("query", "komodo"))
    .query(async ({ ctx }) => {
      const handler = komodoServerOverviewRequestHandler.handler(ctx.integration, {});
      const { data, timestamp } = await handler.getDataAsync();

      return {
        servers: data,
        updatedAt: timestamp,
      };
    }),
});
