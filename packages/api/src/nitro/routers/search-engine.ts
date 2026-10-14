import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { byIdSchema, paginatedSchema, searchSchema } from "@homarr/validation/common";
import { searchEngineEditSchema, searchEngineManageSchema } from "@homarr/validation/search-engine";

import { backendContractRevision } from "../context";
import { defineBackendContribution } from "../contribution";
import { authenticatedProcedure, sourceProcedure, sourceProjectionMeta } from "../procedure";
import type { AppsSearchSourceBinding, SearchEngineProcedureResources } from "./-apps-search/resources";
import { runActiveRequest } from "./-apps-search/resources";
import { getSearchServerSettingsAsync, updateSearchServerSettingsAsync } from "./-apps-search/search-settings";

export type { SearchEngineProcedureResources } from "./-apps-search/resources";

export const searchEngineImplementedPaths = [
  "searchEngine.getPaginated",
  "searchEngine.getSelectable",
  "searchEngine.byId",
  "searchEngine.getDefaultSearchEngine",
  "searchEngine.catalog",
  "searchEngine.search",
  "searchEngine.create",
  "searchEngine.update",
] as const;
export const searchEnginePendingPaths = [
  {
    path: "searchEngine.delete",
    sourceFile: "packages/api/src/router/search-engine/search-engine-router.ts",
    status: "pending",
    reason:
      "Clearing users' defaults and deleting the engine requires an accepted same-session dual-engine transaction boundary; no partial-write implementation is registered.",
  },
] as const satisfies readonly AppsSearchSourceBinding[];
export const searchEngineSourceBindings = [
  ...searchEngineImplementedPaths.map((path) => ({
    path,
    sourceFile: "packages/api/src/router/search-engine/search-engine-router.ts",
    status: "native" as const,
  })),
  ...searchEnginePendingPaths,
] satisfies readonly AppsSearchSourceBinding[];

export function createSearchEngineProcedures(resources: SearchEngineProcedureResources) {
  if (typeof resources.createId !== "function" || typeof resources.warn !== "function")
    throw new Error("Search engine identity and diagnostic resources are required");
  const { searchEngines, users } = resources.tables;
  const { and, asc, eq, like } = resources.operators;
  const integration = { columns: { kind: true, url: true, id: true } } as const;
  return {
    getPaginated: authenticatedProcedure({
      path: "searchEngine.getPaginated",
      kind: "query",
      access: { kind: "protected" },
      demo: "guarded",
    })
      .input(paginatedSchema)
      .handler(({ input, context }) =>
        runActiveRequest(context, async () => {
          const whereQuery = input.search ? like(searchEngines.name, `%${input.search.trim()}%`) : undefined;
          const searchEngineCount = await context.db.$count(searchEngines, whereQuery);
          context.signal.throwIfAborted();
          const dbSearchEngines = await context.db.query.searchEngines.findMany({
            limit: input.pageSize,
            offset: (input.page - 1) * input.pageSize,
            where: whereQuery,
          });
          return { items: dbSearchEngines, totalCount: searchEngineCount };
        }),
      ),
    getSelectable: authenticatedProcedure({
      path: "searchEngine.getSelectable",
      kind: "query",
      access: { kind: "protected" },
      demo: "guarded",
    })
      .input(z.object({ withIntegrations: z.boolean() }).default({ withIntegrations: true }))
      .handler(({ input, context }) =>
        runActiveRequest(context, async () => {
          const engines = await context.db.query.searchEngines.findMany({
            orderBy: asc(searchEngines.name),
            where: input.withIntegrations ? undefined : eq(searchEngines.type, "generic"),
            columns: { id: true, name: true },
          });
          return engines.map((engine) => ({ value: engine.id, label: engine.name }));
        }),
      ),
    byId: authenticatedProcedure({
      path: "searchEngine.byId",
      kind: "query",
      access: { kind: "protected" },
      demo: "guarded",
    })
      .input(byIdSchema)
      .handler(({ input, context }) =>
        runActiveRequest(context, async () => {
          const searchEngine = await context.db.query.searchEngines.findFirst({
            where: eq(searchEngines.id, input.id),
          });
          if (!searchEngine) throw new ORPCError("NOT_FOUND", { message: "Search engine not found" });
          return searchEngine.type === "fromIntegration"
            ? { ...searchEngine, type: "fromIntegration" as const, integrationId: searchEngine.integrationId }
            : { ...searchEngine, type: "generic" as const, urlTemplate: searchEngine.urlTemplate };
        }),
      ),
    getDefaultSearchEngine: sourceProcedure({
      path: "searchEngine.getDefaultSearchEngine",
      kind: "query",
      access: { kind: "public" },
      demo: "guarded",
    }).handler(({ context }) =>
      runActiveRequest(context, async () => {
        const userDefaultId =
          context.principal.kind === "authenticated" && context.principal.user.id
            ? ((
                await context.db.query.users.findFirst({
                  where: eq(users.id, context.principal.user.id),
                  columns: { defaultSearchEngineId: true },
                })
              )?.defaultSearchEngineId ?? null)
            : null;
        context.signal.throwIfAborted();
        if (userDefaultId)
          return await context.db.query.searchEngines.findFirst({
            where: eq(searchEngines.id, userDefaultId),
            with: { integration },
          });
        const searchSettings = await getSearchServerSettingsAsync(context.db, resources);
        context.signal.throwIfAborted();
        if (!searchSettings.defaultSearchEngineId) return null;
        const serverDefault = await context.db.query.searchEngines.findFirst({
          where: eq(searchEngines.id, searchSettings.defaultSearchEngineId),
          with: { integration },
        });
        context.signal.throwIfAborted();
        if (serverDefault) return serverDefault;
        try {
          await updateSearchServerSettingsAsync(context.db, resources, {
            ...searchSettings,
            defaultSearchEngineId: null,
          });
        } catch (error) {
          resources.warn(
            new Error("Failed to update search settings after default search engine not found", { cause: error }),
          );
        }
        return null;
      }),
    ),
    catalog: sourceProcedure({
      path: "searchEngine.catalog",
      kind: "query",
      access: { kind: "public" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({
          mcp: { enabled: true, description: "List search engines available to the current user." },
        }),
      )
      .handler(({ context }) =>
        runActiveRequest(context, () =>
          context.db.query.searchEngines.findMany({
            where: context.principal.kind === "authenticated" ? undefined : eq(searchEngines.type, "generic"),
            orderBy: asc(searchEngines.name),
            with: { integration },
          }),
        ),
      ),
    search: sourceProcedure({ path: "searchEngine.search", kind: "query", access: { kind: "public" }, demo: "guarded" })
      .input(searchSchema)
      .handler(({ input, context }) =>
        runActiveRequest(context, () =>
          context.db.query.searchEngines.findMany({
            where: and(
              like(searchEngines.short, `${input.query.toLowerCase().trim()}%`),
              context.principal.kind === "authenticated" ? undefined : eq(searchEngines.type, "generic"),
            ),
            with: { integration },
            limit: input.limit,
          }),
        ),
      ),
    create: authenticatedProcedure({
      path: "searchEngine.create",
      kind: "mutation",
      access: { kind: "permission", permission: "search-engine-create" },
      demo: "guarded",
    })
      .input(searchEngineManageSchema)
      .handler(({ input, context }) =>
        runActiveRequest(context, async () => {
          await context.db.insert(searchEngines).values({
            id: resources.createId(),
            name: input.name,
            short: input.short.toLowerCase(),
            iconUrl: input.iconUrl,
            urlTemplate: "urlTemplate" in input ? input.urlTemplate : null,
            description: input.description,
            type: input.type,
            integrationId: "integrationId" in input ? input.integrationId : null,
          });
        }),
      ),
    update: authenticatedProcedure({
      path: "searchEngine.update",
      kind: "mutation",
      access: { kind: "permission", permission: "search-engine-modify-all" },
      demo: "guarded",
    })
      .input(searchEngineEditSchema)
      .handler(({ input, context }) =>
        runActiveRequest(context, async () => {
          const searchEngine = await context.db.query.searchEngines.findFirst({
            where: eq(searchEngines.id, input.id),
          });
          if (!searchEngine) throw new ORPCError("NOT_FOUND", { message: "Search engine not found" });
          context.signal.throwIfAborted();
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
      ),
  };
}

export function createSearchEngineContribution(resources: SearchEngineProcedureResources) {
  return defineBackendContribution({
    revision: backendContractRevision,
    id: "homarr.search-engines.source-port.v2",
    router: { searchEngine: createSearchEngineProcedures(resources) },
    leaves: searchEngineImplementedPaths,
  });
}
