import { TRPCError } from "@trpc/server";

import { createId, eq, like, sql } from "@homarr/db";
import { searchEngines } from "@homarr/db/schema/sqlite";
import { validation } from "@homarr/validation";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure } from "../../trpc";

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
  search: protectedProcedure.input(validation.common.search).query(async ({ ctx, input }) => {
    return await ctx.db.query.searchEngines.findMany({
      where: like(searchEngines.short, `${input.query.toLowerCase().trim()}%`),
      limit: input.limit,
    });
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
      await ctx.db.delete(searchEngines).where(eq(searchEngines.id, input.id));
    }),
});
