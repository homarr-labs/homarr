import { z } from "zod/v4";

import { createIntegrationAsync, IncusIntegration } from "@homarr/integrations";
import { clusterInfoRequestHandler } from "@homarr/request-handler/health-monitoring";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, permissionRequiredProcedure, publicProcedure } from "../../trpc";

export const incusRouter = createTRPCRouter({
  /**
   * Get all instances from an Incus server
   */
  getInstances: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "incus"))
    .query(async ({ ctx }) => {
      const integration = await createIntegrationAsync(ctx.integration);
      const instances = await (integration as IncusIntegration).getInstancesAsync();
      return instances.map((instance) => ({
        name: instance.name,
        status: instance.status,
        type: instance.type,
        description: instance.description ?? "",
        location: instance.location ?? "local",
        createdAt: instance.created_at,
      }));
    }),

  /**
   * Start one or more instances
   */
  startInstances: permissionRequiredProcedure
    .requiresPermission("integration-interact-all")
    .concat(createOneIntegrationMiddleware("interact", "incus"))
    .input(z.object({ instanceNames: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const integration = await createIntegrationAsync(ctx.integration);
      const incus = integration as IncusIntegration;

      const results = await Promise.allSettled(
        input.instanceNames.map((name) => incus.startInstanceAsync(name)),
      );

      // Invalidate the health monitoring cache
      const innerHandler = clusterInfoRequestHandler.handler(ctx.integration, {});
      await innerHandler.invalidateAsync();

      return {
        success: results.filter((r) => r.status === "fulfilled").length,
        failed: results.filter((r) => r.status === "rejected").length,
      };
    }),

  /**
   * Stop one or more instances
   */
  stopInstances: permissionRequiredProcedure
    .requiresPermission("integration-interact-all")
    .concat(createOneIntegrationMiddleware("interact", "incus"))
    .input(z.object({ instanceNames: z.array(z.string()), force: z.boolean().optional().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const integration = await createIntegrationAsync(ctx.integration);
      const incus = integration as IncusIntegration;

      const results = await Promise.allSettled(
        input.instanceNames.map((name) => incus.stopInstanceAsync(name, input.force)),
      );

      // Invalidate the health monitoring cache
      const innerHandler = clusterInfoRequestHandler.handler(ctx.integration, {});
      await innerHandler.invalidateAsync();

      return {
        success: results.filter((r) => r.status === "fulfilled").length,
        failed: results.filter((r) => r.status === "rejected").length,
      };
    }),

  /**
   * Restart one or more instances
   */
  restartInstances: permissionRequiredProcedure
    .requiresPermission("integration-interact-all")
    .concat(createOneIntegrationMiddleware("interact", "incus"))
    .input(z.object({ instanceNames: z.array(z.string()), force: z.boolean().optional().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const integration = await createIntegrationAsync(ctx.integration);
      const incus = integration as IncusIntegration;

      const results = await Promise.allSettled(
        input.instanceNames.map((name) => incus.restartInstanceAsync(name, input.force)),
      );

      // Invalidate the health monitoring cache
      const innerHandler = clusterInfoRequestHandler.handler(ctx.integration, {});
      await innerHandler.invalidateAsync();

      return {
        success: results.filter((r) => r.status === "fulfilled").length,
        failed: results.filter((r) => r.status === "rejected").length,
      };
    }),

  /**
   * Freeze (pause) one or more instances
   */
  freezeInstances: permissionRequiredProcedure
    .requiresPermission("integration-interact-all")
    .concat(createOneIntegrationMiddleware("interact", "incus"))
    .input(z.object({ instanceNames: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const integration = await createIntegrationAsync(ctx.integration);
      const incus = integration as IncusIntegration;

      const results = await Promise.allSettled(
        input.instanceNames.map((name) => incus.freezeInstanceAsync(name)),
      );

      // Invalidate the health monitoring cache
      const innerHandler = clusterInfoRequestHandler.handler(ctx.integration, {});
      await innerHandler.invalidateAsync();

      return {
        success: results.filter((r) => r.status === "fulfilled").length,
        failed: results.filter((r) => r.status === "rejected").length,
      };
    }),

  /**
   * Unfreeze (resume) one or more instances
   */
  unfreezeInstances: permissionRequiredProcedure
    .requiresPermission("integration-interact-all")
    .concat(createOneIntegrationMiddleware("interact", "incus"))
    .input(z.object({ instanceNames: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const integration = await createIntegrationAsync(ctx.integration);
      const incus = integration as IncusIntegration;

      const results = await Promise.allSettled(
        input.instanceNames.map((name) => incus.unfreezeInstanceAsync(name)),
      );

      // Invalidate the health monitoring cache
      const innerHandler = clusterInfoRequestHandler.handler(ctx.integration, {});
      await innerHandler.invalidateAsync();

      return {
        success: results.filter((r) => r.status === "fulfilled").length,
        failed: results.filter((r) => r.status === "rejected").length,
      };
    }),

  /**
   * Get detailed state of a specific instance
   */
  getInstanceState: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "incus"))
    .input(z.object({ instanceName: z.string() }))
    .query(async ({ ctx, input }) => {
      const integration = await createIntegrationAsync(ctx.integration);
      const incus = integration as IncusIntegration;
      const state = await incus.getInstanceStateAsync(input.instanceName);
      return state;
    }),

  /**
   * Get server info
   */
  getServerInfo: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "incus"))
    .query(async ({ ctx }) => {
      const integration = await createIntegrationAsync(ctx.integration);
      const incus = integration as IncusIntegration;
      const serverInfo = await incus.getServerInfoAsync();
      return {
        serverName: serverInfo.environment?.server_name ?? "incus",
        serverVersion: serverInfo.environment?.server_version ?? "unknown",
        isClustered: serverInfo.environment?.server_clustered ?? false,
        osName: serverInfo.environment?.os_name ?? "unknown",
        osVersion: serverInfo.environment?.os_version ?? "unknown",
        kernelVersion: serverInfo.environment?.kernel_version ?? "unknown",
      };
    }),

  /**
   * Get storage pools
   */
  getStoragePools: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "incus"))
    .query(async ({ ctx }) => {
      const integration = await createIntegrationAsync(ctx.integration);
      const incus = integration as IncusIntegration;
      const pools = await incus.getStoragePoolsAsync();
      return pools.map((pool) => ({
        name: pool.name,
        driver: pool.driver,
        status: pool.status ?? "unknown",
        description: pool.description ?? "",
      }));
    }),
});
