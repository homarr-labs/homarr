import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { appCreateManySchema, appEditSchema, appManageSchema } from "@homarr/validation/app";
import { byIdSchema, paginatedSchema } from "@homarr/validation/common";

import { backendContractRevision } from "../context";
import { defineBackendContribution } from "../contribution";
import { authenticatedProcedure, sourceProcedure, sourceProjectionMeta } from "../procedure";
import { convertIntersectionToZodObject } from "../../schema-merger";
import { AppRepository } from "./-apps-search/app-access-control";
import { getIconForName } from "./-apps-search/icons";
import type { AppProcedureResources, AppsSearchSourceBinding } from "./-apps-search/resources";
import { runActiveRequest } from "./-apps-search/resources";

export type { AppProcedureResources } from "./-apps-search/resources";

export const appImplementedPaths = [
  "app.getPaginated",
  "app.all",
  "app.search",
  "app.selectable",
  "app.byId",
  "app.byIds",
  "app.create",
  "app.createMany",
  "app.update",
  "app.delete",
] as const;
export const appPendingPaths = [] as const;
export const appSourceBindings = appImplementedPaths.map((path) => ({
  path,
  sourceFile: "packages/api/src/router/app.ts",
  status: "native" as const,
})) satisfies readonly AppsSearchSourceBinding[];

const defaultIcon = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/homarr.svg";

export function createAppProcedures(resources: AppProcedureResources) {
  if (
    typeof resources.createId !== "function" ||
    typeof resources.invalidateIntegrationResponseCacheAsync !== "function"
  )
    throw new Error("App identity and cache invalidation resources are required");
  const { apps, integrations } = resources.tables;
  const { asc, eq, like } = resources.operators;
  const { selectAppSchema } = resources;
  return {
    getPaginated: authenticatedProcedure({
      path: "app.getPaginated",
      kind: "query",
      access: { kind: "permission", permission: "app-modify-all" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "GET",
            path: "/api/apps/paginated",
            tags: ["apps"],
            protect: true,
            summary: "List apps with pagination",
            description:
              "Return apps ordered by name with a total count. Supports a name filter and page controls. Requires app-modify-all permission.",
          },
          mcp: {
            enabled: true,
            description:
              "List apps with pagination. OPTIONAL: search (string to filter by name), pageSize (number, default 10), page (number, default 1). All fields are optional — call with no arguments to get the first page",
          },
        }),
      )
      .input(paginatedSchema)
      .output(z.object({ items: z.array(selectAppSchema), totalCount: z.number() }))
      .handler(({ input, context }) =>
        runActiveRequest(context, async () => {
          const whereQuery = input.search ? like(apps.name, `%${input.search.trim()}%`) : undefined;
          const totalCount = await context.db.$count(apps, whereQuery);
          context.signal.throwIfAborted();
          const dbApps = await context.db.query.apps.findMany({
            limit: input.pageSize,
            offset: (input.page - 1) * input.pageSize,
            where: whereQuery,
            orderBy: asc(apps.name),
          });
          return { items: dbApps, totalCount };
        }),
      ),
    all: authenticatedProcedure({
      path: "app.all",
      kind: "query",
      access: { kind: "permission", permission: "app-modify-all" },
      demo: "guarded",
    })
      .input(z.void())
      .output(z.array(selectAppSchema))
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "GET",
            path: "/api/apps",
            tags: ["apps"],
            protect: true,
            summary: "List all apps",
            description: "Return all apps ordered by name. Requires app-modify-all permission.",
          },
          mcp: { enabled: true, description: "List all apps" },
        }),
      )
      .handler(({ context }) =>
        runActiveRequest(context, () => context.db.query.apps.findMany({ orderBy: asc(apps.name) })),
      ),
    search: authenticatedProcedure({
      path: "app.search",
      kind: "query",
      access: { kind: "protected" },
      demo: "guarded",
    })
      .input(z.object({ query: z.string(), limit: z.number().min(1).max(100).default(10) }))
      .output(z.array(selectAppSchema))
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "GET",
            path: "/api/apps/search",
            tags: ["apps"],
            protect: true,
            summary: "Search apps",
            description:
              "Find apps whose names contain the query, ordered by name. Requires app-modify-all or board-modify-all permission; returns up to 100 results.",
          },
          mcp: {
            enabled: true,
            description: "Search apps by name. REQUIRED: query (search string). OPTIONAL: limit (number, default 10)",
          },
        }),
      )
      .handler(({ input, context }) =>
        runActiveRequest(context, () => {
          if (
            !context.principal.user.permissions.includes("app-modify-all") &&
            !context.principal.user.permissions.includes("board-modify-all")
          )
            throw new ORPCError("FORBIDDEN", { message: "Permission denied" });
          return context.db.query.apps.findMany({
            where: like(apps.name, `%${input.query}%`),
            orderBy: asc(apps.name),
            limit: input.limit,
          });
        }),
      ),
    selectable: authenticatedProcedure({
      path: "app.selectable",
      kind: "query",
      access: { kind: "protected" },
      demo: "guarded",
    })
      .input(z.void())
      .output(
        z.array(
          selectAppSchema.pick({ id: true, name: true, iconUrl: true, href: true, pingUrl: true, description: true }),
        ),
      )
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "GET",
            path: "/api/apps/selectable",
            tags: ["apps"],
            protect: true,
            summary: "List selectable apps",
            description:
              "Return app IDs, names, icons, descriptions, destination URLs, and ping URLs for selection controls. Requires authentication.",
          },
        }),
      )
      .handler(({ context }) =>
        runActiveRequest(context, () =>
          context.db.query.apps.findMany({
            columns: { id: true, name: true, iconUrl: true, description: true, href: true, pingUrl: true },
            orderBy: asc(apps.name),
          }),
        ),
      ),
    byId: sourceProcedure({ path: "app.byId", kind: "query", access: { kind: "public" }, demo: "guarded" })
      .input(byIdSchema)
      .output(selectAppSchema)
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "GET",
            path: "/api/apps/{id}",
            tags: ["apps"],
            protect: true,
            summary: "Get an app",
            description:
              "Return an app by ID. Signed-in users can access all apps; anonymous access is limited to apps placed on public boards. Missing or inaccessible apps return not found.",
          },
          mcp: { enabled: true, description: "Get a single app by its ID. REQUIRED: id (app ID string)" },
        }),
      )
      .handler(({ input, context }) =>
        runActiveRequest(context, async () => {
          const repository = new AppRepository(context.db, context.principal, resources, context.signal);
          const app = await repository.getByIdAsync(input.id);
          if (!app) throw new ORPCError("NOT_FOUND", { message: "App not found" });
          return app;
        }),
      ),
    byIds: sourceProcedure({ path: "app.byIds", kind: "query", access: { kind: "public" }, demo: "guarded" })
      .input(z.array(z.string()))
      .handler(({ input, context }) =>
        runActiveRequest(context, () =>
          new AppRepository(context.db, context.principal, resources, context.signal).getByIdsAsync(input),
        ),
      ),
    create: authenticatedProcedure({
      path: "app.create",
      kind: "mutation",
      access: { kind: "permission", permission: "app-create" },
      demo: "guarded",
    })
      .input(appManageSchema)
      .output(z.object({ appId: z.string() }).and(selectAppSchema))
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "POST",
            path: "/api/apps",
            tags: ["apps"],
            protect: true,
            summary: "Create an app",
            description:
              "Create an app bookmark. Requires app-create permission. Returns the app, including its ID and the legacy appId field. An empty pingUrl disables the custom ping URL.",
          },
          mcp: {
            enabled: true,
            description:
              "Create a new app (bookmark/shortcut to a service). REQUIRED: name (string), iconUrl (icon URL string), href (app URL or custom URI scheme such as vscode://, or blank). OPTIONAL: description (string or null), pingUrl (URL to check reachability, or empty string)",
          },
        }),
      )
      .handler(({ input, context }) =>
        runActiveRequest(context, async () => {
          const id = resources.createId();
          const insertValues = {
            id,
            name: input.name,
            description: input.description,
            iconUrl: input.iconUrl,
            href: input.href,
            pingUrl: input.pingUrl === "" ? null : input.pingUrl,
          };
          await context.db.insert(apps).values(insertValues);
          return { appId: id, ...insertValues };
        }),
      ),
    createMany: authenticatedProcedure({
      path: "app.createMany",
      kind: "mutation",
      access: { kind: "permission", permission: "app-create" },
      demo: "guarded",
    })
      .input(appCreateManySchema)
      .output(z.void())
      .handler(({ input, context }) =>
        runActiveRequest(context, async () => {
          const values: (typeof apps.$inferInsert)[] = [];
          for (const app of input) {
            context.signal.throwIfAborted();
            const id = resources.createId();
            const iconUrl = app.iconUrl ?? (await getIconForName(context.db, resources, app.name))?.url ?? defaultIcon;
            values.push({ id, name: app.name, description: app.description, iconUrl, href: app.href });
          }
          context.signal.throwIfAborted();
          await context.db.insert(apps).values(values);
        }),
      ),
    update: authenticatedProcedure({
      path: "app.update",
      kind: "mutation",
      access: { kind: "permission", permission: "app-modify-all" },
      demo: "guarded",
    })
      .input(convertIntersectionToZodObject(appEditSchema))
      .output(z.void())
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "PATCH",
            path: "/api/apps/{id}",
            tags: ["apps"],
            protect: true,
            summary: "Update an app",
            description:
              "Update an app by ID. Requires app-modify-all permission. Supply all required app fields; an empty pingUrl clears the custom ping URL. Changing href invalidates linked integration caches.",
          },
          mcp: {
            enabled: true,
            description:
              "Update an existing app. REQUIRED: id (app ID), name, iconUrl, href. OPTIONAL: description (string or null), pingUrl (URL or empty string)",
          },
        }),
      )
      .handler(({ input, context }) =>
        runActiveRequest(context, async () => {
          const app = await context.db.query.apps.findFirst({ where: eq(apps.id, input.id) });
          if (!app) throw new ORPCError("NOT_FOUND", { message: "App not found" });
          context.signal.throwIfAborted();
          await context.db
            .update(apps)
            .set({
              name: input.name,
              description: input.description,
              iconUrl: input.iconUrl,
              href: input.href,
              pingUrl: input.pingUrl === "" ? null : input.pingUrl,
            })
            .where(eq(apps.id, input.id));
          if (app.href !== input.href) {
            const linkedIntegrations = await context.db.query.integrations.findMany({
              columns: { id: true },
              where: eq(integrations.appId, input.id),
            });
            await Promise.all(
              linkedIntegrations.map(({ id }) => resources.invalidateIntegrationResponseCacheAsync(id)),
            );
          }
        }),
      ),
    delete: authenticatedProcedure({
      path: "app.delete",
      kind: "mutation",
      access: { kind: "permission", permission: "app-full-all" },
      demo: "guarded",
    })
      .output(z.void())
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "DELETE",
            path: "/api/apps/{id}",
            tags: ["apps"],
            protect: true,
            summary: "Delete an app",
            description:
              "Delete an app by ID and invalidate linked integration caches. Requires app-full-all permission.",
          },
          mcp: { enabled: true, description: "Delete an app by ID. REQUIRED: id (app ID string)" },
        }),
      )
      .input(byIdSchema)
      .handler(({ input, context }) =>
        runActiveRequest(context, async () => {
          const linkedIntegrations = await context.db.query.integrations.findMany({
            columns: { id: true },
            where: eq(integrations.appId, input.id),
          });
          context.signal.throwIfAborted();
          await context.db.delete(apps).where(eq(apps.id, input.id));
          await Promise.all(linkedIntegrations.map(({ id }) => resources.invalidateIntegrationResponseCacheAsync(id)));
        }),
      ),
  };
}

export function createAppContribution(resources: AppProcedureResources) {
  return defineBackendContribution({
    revision: backendContractRevision,
    id: "homarr.apps.source-port.v2",
    router: { app: createAppProcedures(resources) },
    leaves: appImplementedPaths,
  });
}
