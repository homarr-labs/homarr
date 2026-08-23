import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";

import { createIntegrationAsync } from "@homarr/integrations/factory";
import {
  smartHomeEntityStateRequestHandler,
  toSafeEntityDetails,
} from "@homarr/request-handler/smart-home-entity-state";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

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
    .concat(createOneWidgetIntegrationMiddleware("query", "smartHome-entityState"))
    .query(async ({ ctx: { integration }, input }) => {
      const innerHandler = smartHomeEntityStateRequestHandler.handler(integration, { entityId: input.entityId });
      const { data } = await innerHandler.getDataAsync();
      return data.state;
    }),
  entityDetails: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get the state, attributes, and update timestamps for a Home Assistant entity. REQUIRED: integrationId (Home Assistant integration ID), entityId (for example 'sensor.temperature')",
      },
    })
    .input(z.object({ entityId: z.string() }))
    .concat(createOneWidgetIntegrationMiddleware("query", "smartHome-entityState"))
    .query(async ({ ctx: { integration }, input }) => {
      const innerHandler = smartHomeEntityStateRequestHandler.handler(integration, { entityId: input.entityId });
      const { data } = await innerHandler.getDataAsync();
      return toSafeEntityDetails(data);
    }),
  switchEntity: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Toggle a Home Assistant entity (turn on/off a light, switch, etc.). REQUIRED: integrationId (Home Assistant integration ID from integration_all), entityId (e.g. 'light.living_room')",
      },
    })
    .concat(createOneWidgetIntegrationMiddleware("interact", "smartHome-entityState"))
    .input(z.object({ entityId: z.string() }))
    .mutation(async ({ ctx: { integration }, input }) => {
      const client = await createIntegrationAsync(integration);
      const success = await client.triggerToggleAsync(input.entityId);
      if (!success) {
        throw new TRPCError({ code: "BAD_GATEWAY", message: "Home Assistant did not toggle the entity" });
      }
      await smartHomeEntityStateRequestHandler.invalidateCacheAsync([integration.id]);
      return true;
    }),
  executeAutomation: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Trigger a Home Assistant automation by its ID. REQUIRED: integrationId (Home Assistant integration ID from integration_all), automationId (the automation entity ID)",
      },
    })
    .concat(createOneWidgetIntegrationMiddleware("interact", "smartHome-executeAutomation"))
    .input(z.object({ automationId: z.string() }))
    .mutation(async ({ ctx: { integration }, input }) => {
      const client = await createIntegrationAsync(integration);
      const success = await client.triggerAutomationAsync(input.automationId);
      if (!success) {
        throw new TRPCError({ code: "BAD_GATEWAY", message: "Home Assistant did not execute the automation" });
      }
      await smartHomeEntityStateRequestHandler.invalidateCacheAsync([integration.id]);
      return true;
    }),
});
