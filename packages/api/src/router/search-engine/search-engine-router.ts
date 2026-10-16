import { ApiError } from "../../procedure";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { and, asc, eq, like } from "@homarr/db";
import { getServerSettingByKeyAsync, updateServerSettingByKeyAsync } from "@homarr/db/queries";
import { searchEngines, users } from "@homarr/db/schema";
import { byIdSchema, paginatedSchema, searchSchema } from "@homarr/validation/common";
import { searchEngineEditSchema, searchEngineManageSchema } from "@homarr/validation/search-engine";

import { createApiRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../../procedure";

const logger = createLogger({ module: "searchEngineRouter" });

export const searchEngineRouter = createApiRouter({
  getPaginated: protectedProcedure.input(paginatedSchema).query(async ({ input, context }) => {
    const whereQuery = input.search ? like(searchEngines.name, `%${input.search.trim()}%`) : undefined;
    const searchEngineCount = await context.db.$count(searchEngines, whereQuery);

    const dbSearachEngines = await context.db.query.searchEngines.findMany({
      limit: input.pageSize,
      offset: (input.page - 1) * input.pageSize,
      where: whereQuery,
    });

    return {
      items: dbSearachEngines,
      totalCount: searchEngineCount,
    };
  }),
  getSelectable: protectedProcedure
    .input(z.object({ withIntegrations: z.boolean() }).default({ withIntegrations: true }))
    .query(async ({ context, input }) => {
      return await context.db.query.searchEngines
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

  byId: protectedProcedure.input(byIdSchema).query(async ({ context, input }) => {
    const searchEngine = await context.db.query.searchEngines.findFirst({
      where: eq(searchEngines.id, input.id),
    });

    if (!searchEngine) {
      throw new ApiError({
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
  getDefaultSearchEngine: publicProcedure.query(async ({ context }) => {
    const userDefaultId = context.session?.user.id
      ? ((await context.db.query.users
          .findFirst({
            where: eq(users.id, context.session.user.id),
            columns: {
              defaultSearchEngineId: true,
            },
          })
          .then((user) => user?.defaultSearchEngineId)) ?? null)
      : null;

    if (userDefaultId) {
      return await context.db.query.searchEngines.findFirst({
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

    const searchSettings = await getServerSettingByKeyAsync(context.db, "search");

    if (!searchSettings.defaultSearchEngineId) return null;

    const serverDefault = await context.db.query.searchEngines.findFirst({
      where: eq(searchEngines.id, searchSettings.defaultSearchEngineId),
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

    if (serverDefault) return serverDefault;

    // Remove the default search engine ID from settings if it does not longer exist
    try {
      await updateServerSettingByKeyAsync(context.db, "search", {
        ...searchSettings,
        defaultSearchEngineId: null,
      });
    } catch (error) {
      logger.warn(
        new Error("Failed to update search settings after default search engine not found", { cause: error }),
      );
    }

    return null;
  }),
  catalog: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description: "List search engines available to the current user.",
      },
    })
    .query(async ({ context }) => {
      return await context.db.query.searchEngines.findMany({
        where: context.session?.user ? undefined : eq(searchEngines.type, "generic"),
        orderBy: asc(searchEngines.name),
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
    }),
  search: publicProcedure.input(searchSchema).query(async ({ context, input }) => {
    return await context.db.query.searchEngines.findMany({
      // Public dashboards have no session: restrict anonymous users to generic
      // (non-integration) engines so custom search engines work there too (#4132),
      // while integration-backed engines stay available only when signed in.
      where: and(
        like(searchEngines.short, `${input.query.toLowerCase().trim()}%`),
        context.session?.user ? undefined : eq(searchEngines.type, "generic"),
      ),
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
  create: permissionRequiredProcedure
    .requiresPermission("search-engine-create")
    .input(searchEngineManageSchema)
    .mutation(async ({ context, input }) => {
      await context.db.insert(searchEngines).values({
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
    .input(searchEngineEditSchema)
    .mutation(async ({ context, input }) => {
      const searchEngine = await context.db.query.searchEngines.findFirst({
        where: eq(searchEngines.id, input.id),
      });

      if (!searchEngine) {
        throw new ApiError({
          code: "NOT_FOUND",
          message: "Search engine not found",
        });
      }

      await context.db
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
    .input(byIdSchema)
    .mutation(async ({ context, input }) => {
      await context.db
        .update(users)
        .set({
          defaultSearchEngineId: null,
        })
        .where(eq(users.defaultSearchEngineId, input.id));
      await context.db.delete(searchEngines).where(eq(searchEngines.id, input.id));
    }),
});
