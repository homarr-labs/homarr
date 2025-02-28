import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { asc, createId, eq, like, sql } from "@homarr/db";
import { getServerSettingByKeyAsync } from "@homarr/db/queries";
import { searchEngines, users } from "@homarr/db/schema";
import { createIntegrationAsync } from "@homarr/integrations";
import { validation } from "@homarr/validation";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../../trpc";

export const searchEngineRouter = createTRPCRouter({
  getPaginated: protectedProcedure.input(validation.common.paginated).query(async ({ input, ctx }) => {
    const whereQuery = input.search ? like(searchEngines.name, `%${input.search.trim()}%`) : undefined;
    const searchEngineCount = await ctx.db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(searchEngines)
      .where(whereQuery);

    const dbSearachEngines = await ctx.db.query.searchEngines.findMany({
      limit: input.pageSize,
      offset: (input.page - 1) * input.pageSize,
      where: whereQuery,
    });

    return {
      items: dbSearachEngines,
      totalCount: searchEngineCount[0]?.count ?? 0,
    };
  }),
  getSelectable: protectedProcedure
    .input(z.object({ withIntegrations: z.boolean() }).default({ withIntegrations: true }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.searchEngines
        .findMany({
          orderBy: asc(searchEngines.name),
          where: input.withIntegrations ? undefined : eq(searchEngines.type, "generic"),
          columns: {
            id: true,
            name: true,
          },
        })
        .then((engines) => engines.map((engine) => ({ value: engine.id, label: engine.name })));
    }),

  byId: protectedProcedure.input(validation.common.byId).query(async ({ ctx, input }) => {
    const searchEngine = await ctx.db.query.searchEngines.findFirst({
      where: eq(searchEngines.id, input.id),
    });

    if (!searchEngine) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Search engine not found",
      });
    }

    return searchEngine.type === "fromIntegration"
      ? {
          ...searchEngine,
          type: "fromIntegration" as const,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          integrationId: searchEngine.integrationId!,
        }
      : {
          ...searchEngine,
          type: "generic" as const,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          urlTemplate: searchEngine.urlTemplate!,
        };
  }),
  getDefaultSearchEngine: publicProcedure.query(async ({ ctx }) => {
    const userDefaultId = ctx.session?.user.id
      ? ((await ctx.db.query.users
          .findFirst({
            where: eq(users.id, ctx.session.user.id),
            columns: {
              defaultSearchEngineId: true,
            },
          })
          .then((user) => user?.defaultSearchEngineId)) ?? null)
      : null;

    if (userDefaultId) {
      return await ctx.db.query.searchEngines.findFirst({
        where: eq(searchEngines.id, userDefaultId),
        with: {
          integration: {
            columns: {
              kind: true,
              url: true,
              id: true,
            },
          },
        },
      });
    }

    const serverDefaultId = await getServerSettingByKeyAsync(ctx.db, "search").then(
      (setting) => setting.defaultSearchEngineId,
    );

    if (serverDefaultId) {
      return await ctx.db.query.searchEngines.findFirst({
        where: eq(searchEngines.id, serverDefaultId),
        with: {
          integration: {
            columns: {
              kind: true,
              url: true,
              id: true,
            },
          },
        },
      });
    }

    return null;
  }),
  search: protectedProcedure.input(validation.common.search).query(async ({ ctx, input }) => {
    return await ctx.db.query.searchEngines.findMany({
      where: like(searchEngines.short, `${input.query.toLowerCase().trim()}%`),
      with: {
        integration: {
          columns: {
            kind: true,
            url: true,
            id: true,
          },
        },
      },
      limit: input.limit,
    });
  }),
  getMediaRequestOptions: protectedProcedure
    .unstable_concat(createOneIntegrationMiddleware("query", "jellyseerr", "overseerr"))
    .input(validation.common.mediaRequestOptions)
    .query(async ({ ctx, input }) => {
      const integration = await createIntegrationAsync(ctx.integration);
      return await integration.getSeriesInformationAsync(input.mediaType, input.mediaId);
    }),
  requestMedia: protectedProcedure
    .unstable_concat(createOneIntegrationMiddleware("interact", "jellyseerr", "overseerr"))
    .input(validation.common.requestMedia)
    .mutation(async ({ ctx, input }) => {
      const integration = await createIntegrationAsync(ctx.integration);
      return await integration.requestMediaAsync(input.mediaType, input.mediaId, input.seasons);
    }),
  create: permissionRequiredProcedure
    .requiresPermission("search-engine-create")
    .input(validation.searchEngine.manage)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(searchEngines).values({
        id: createId(),
        name: input.name,
        short: input.short.toLowerCase(),
        iconUrl: input.iconUrl,
        urlTemplate: "urlTemplate" in input ? input.urlTemplate : null,
        description: input.description,
        type: input.type,
        integrationId: "integrationId" in input ? input.integrationId : null,
      });
    }),
  update: permissionRequiredProcedure
    .requiresPermission("search-engine-modify-all")
    .input(validation.searchEngine.edit)
    .mutation(async ({ ctx, input }) => {
      const searchEngine = await ctx.db.query.searchEngines.findFirst({
        where: eq(searchEngines.id, input.id),
      });

      if (!searchEngine) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Search engine not found",
        });
      }

      await ctx.db
        .update(searchEngines)
        .set({
          name: input.name,
          iconUrl: input.iconUrl,
          urlTemplate: "urlTemplate" in input ? input.urlTemplate : null,
          description: input.description,
          integrationId: "integrationId" in input ? input.integrationId : null,
          type: input.type,
        })
        .where(eq(searchEngines.id, input.id));
    }),
  delete: permissionRequiredProcedure
    .requiresPermission("search-engine-full-all")
    .input(validation.common.byId)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set({
          defaultSearchEngineId: null,
        })
        .where(eq(users.defaultSearchEngineId, input.id));
      await ctx.db.delete(searchEngines).where(eq(searchEngines.id, input.id));
    }),
});
