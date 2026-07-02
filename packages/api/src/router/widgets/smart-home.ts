import { z } from "zod/v4";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import { smartHomeEntityStateRequestHandler } from "@homarr/request-handler/smart-home-entity-state";

import type { IntegrationAction } from "../../middlewares/integration";
import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

const createSmartHomeIntegrationMiddleware = (action: IntegrationAction) =>
  createOneIntegrationMiddleware(action, ...getIntegrationKindsByCategory("smartHomeServer"));

export const smartHomeRouter = createTRPCRouter({
  entityState: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get the current state of a Home Assistant entity (light, switch, sensor, etc.). REQUIRED: integrationId (Home Assistant integration ID from integration_all), entityId (e.g. 'light.living_room', 'switch.fan')",
      },
    })
    .input(z.object({ entityId: z.string() }))
    .concat(createSmartHomeIntegrationMiddleware("query"))
    .query(async ({ ctx: { integration }, input }) => {
      const innerHandler = smartHomeEntityStateRequestHandler.handler(integration, { entityId: input.entityId });
      const { data } = await innerHandler.getDataAsync();
      return data;
    }),
  switchEntity: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Toggle a Home Assistant entity (turn on/off a light, switch, etc.). REQUIRED: integrationId (Home Assistant integration ID from integration_all), entityId (e.g. 'light.living_room')",
      },
    })
    .concat(createSmartHomeIntegrationMiddleware("interact"))
    .input(z.object({ entityId: z.string() }))
    .mutation(async ({ ctx: { integration }, input }) => {
      const client = await createIntegrationAsync(integration);
      const success = await client.triggerToggleAsync(input.entityId);

      return success;
    }),
  executeAutomation: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Trigger a Home Assistant automation by its ID. REQUIRED: integrationId (Home Assistant integration ID from integration_all), automationId (the automation entity ID)",
      },
    })
    .concat(createSmartHomeIntegrationMiddleware("interact"))
    .input(z.object({ automationId: z.string() }))
    .mutation(async ({ ctx: { integration }, input }) => {
      const client = await createIntegrationAsync(integration);
      await client.triggerAutomationAsync(input.automationId);
    }),
});
