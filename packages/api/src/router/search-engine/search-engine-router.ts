import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { and, asc, eq, like } from "@homarr/db";
import { getServerSettingByKeyAsync, updateServerSettingByKeyAsync } from "@homarr/db/queries";
import { searchEngines, users } from "@homarr/db/schema";
import { selectSearchEnginesSchema } from "@homarr/db/validationSchemas";
import { byIdSchema, paginatedSchema, searchSchema } from "@homarr/validation/common";
import {
  searchEngineApiEditSchema,
  searchEngineApiManageSchema,
  searchEngineUrlTemplateSchema,
} from "@homarr/validation/search-engine";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../../trpc";

const logger = createLogger({ module: "searchEngineRouter" });

/**
 * The flat API schemas accept both type specific properties, this makes sure only the ones
 * belonging to the selected type are persisted and that the required one is present and valid.
 *
 * `current` is the stored engine when one is being updated. Integration backed engines used to be
 * creatable without an integration, so such an engine may keep its empty integration and stay
 * editable. Requiring one only when the engine is created or switched to that type prevents new
 * broken engines without making the existing ones impossible to rename.
 */
const extractTypeSpecificValues = (
  input: {
    type: "generic" | "fromIntegration";
    urlTemplate?: string | null;
    integrationId?: string | null;
  },
  current?: { type: string; integrationId: string | null },
) => {
  if (input.type === "generic") {
    const result = searchEngineUrlTemplateSchema.safeParse(input.urlTemplate);

    if (!result.success) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "urlTemplate is required for search engines of type 'generic', must use http:// or https://, and must contain '%s'",
      });
    }

    return { urlTemplate: result.data, integrationId: null };
  }

  if (input.integrationId) {
    return { urlTemplate: null, integrationId: input.integrationId };
  }

  const keepsExistingType = current?.type === "fromIntegration";
  if (!keepsExistingType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "integrationId is required for search engines of type 'fromIntegration'",
    });
  }

  return { urlTemplate: null, integrationId: current.integrationId };
};

/**
 * Keeps the narrowed shape the management UI relies on while staying documentable.
 * Integration backed engines created before an integration was required can still carry
 * no integration id, so it stays nullable instead of failing to serialize.
 */
const searchEngineByIdOutputSchema = z.union([
  selectSearchEnginesSchema.extend({ type: z.literal("fromIntegration"), integrationId: z.string().nullable() }),
  selectSearchEnginesSchema.extend({ type: z.literal("generic"), urlTemplate: z.string().nullable() }),
]);

export const searchEngineRouter = createTRPCRouter({
  getPaginated: protectedProcedure
    .meta({
      openapi: { method: "GET", path: "/api/search-engines", tags: ["search-engines"], protect: true },
      mcp: {
        enabled: true,
        description:
          "List search engines with pagination. OPTIONAL: search (filter by name), pageSize (default 10), page (default 1)",
      },
    })
    .input(paginatedSchema)
    .output(z.object({ items: z.array(selectSearchEnginesSchema), totalCount: z.number() }))
    .query(async ({ input, ctx }) => {
      const whereQuery = input.search ? like(searchEngines.name, `%${input.search.trim()}%`) : undefined;
      const searchEngineCount = await ctx.db.$count(searchEngines, whereQuery);

      const dbSearachEngines = await ctx.db.query.searchEngines.findMany({
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

  byId: protectedProcedure
    .meta({
      openapi: { method: "GET", path: "/api/search-engines/{id}", tags: ["search-engines"], protect: true },
      mcp: { enabled: true, description: "Get a search engine by ID. REQUIRED: id (search engine ID)" },
    })
    .input(byIdSchema)
    .output(searchEngineByIdOutputSchema)
    .query(async ({ ctx, input }) => {
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
          }
        : {
            ...searchEngine,
            type: "generic" as const,
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

    const searchSettings = await getServerSettingByKeyAsync(ctx.db, "search");

    if (!searchSettings.defaultSearchEngineId) return null;

    const serverDefault = await ctx.db.query.searchEngines.findFirst({
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
      await updateServerSettingByKeyAsync(ctx.db, "search", {
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
  search: publicProcedure.input(searchSchema).query(async ({ ctx, input }) => {
    return await ctx.db.query.searchEngines.findMany({
      // Public dashboards have no session: restrict anonymous users to generic
      // (non-integration) engines so custom search engines work there too (#4132),
      // while integration-backed engines stay available only when signed in.
      where: and(
        like(searchEngines.short, `${input.query.toLowerCase().trim()}%`),
        ctx.session?.user ? undefined : eq(searchEngines.type, "generic"),
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
    .meta({
      openapi: { method: "POST", path: "/api/search-engines", tags: ["search-engines"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Create a search engine. REQUIRED: name, short (trigger, max 8 characters), iconUrl, description (or null), type ('generic' or 'fromIntegration'). Generic engines additionally require urlTemplate containing '%s', integration backed ones an integrationId. Returns { id }",
      },
    })
    .input(searchEngineApiManageSchema)
    .output(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const id = createId();
      await ctx.db.insert(searchEngines).values({
        id,
        name: input.name,
        short: input.short.toLowerCase(),
        iconUrl: input.iconUrl,
        description: input.description,
        type: input.type,
        ...extractTypeSpecificValues(input),
      });
      return { id };
    }),
  update: permissionRequiredProcedure
    .requiresPermission("search-engine-modify-all")
    .meta({
      openapi: { method: "PATCH", path: "/api/search-engines/{id}", tags: ["search-engines"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Replace a search engine's complete editable representation. REQUIRED: id, name, iconUrl, description (or null), type. Generic engines additionally require urlTemplate, integration backed ones an integrationId. The short trigger cannot be changed",
      },
    })
    .input(searchEngineApiEditSchema)
    .output(z.void())
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
          description: input.description,
          type: input.type,
          ...extractTypeSpecificValues(input, searchEngine),
        })
        .where(eq(searchEngines.id, input.id));
    }),
  delete: permissionRequiredProcedure
    .requiresPermission("search-engine-full-all")
    .meta({
      openapi: { method: "DELETE", path: "/api/search-engines/{id}", tags: ["search-engines"], protect: true },
      mcp: { enabled: true, description: "Delete a search engine by ID. REQUIRED: id (search engine ID)" },
    })
    .input(byIdSchema)
    .output(z.void())
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
