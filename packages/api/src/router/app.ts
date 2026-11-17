import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { env } from "@homarr/common/env";
import type { Database, InferSelectModel } from "@homarr/db";
import { asc, eq, inArray, like } from "@homarr/db";
import { apps, integrations } from "@homarr/db/schema";
import { selectAppSchema } from "@homarr/db/validationSchemas";
import { fetchWebsiteMetadataAsync, getIconForName, getIconForWebsiteAsync } from "@homarr/icons";
import { invalidateIntegrationResponseCacheAsync } from "@homarr/redis";
import {
  appCreateManySchema,
  appEditSchema,
  appManageSchema,
  parseLinkedDockerContainer,
} from "@homarr/validation/app";
import { env as dockerEnv } from "@homarr/docker/env";
import { dockerContainersRequestHandler } from "@homarr/request-handler/docker";
import { byIdSchema, paginatedSchema } from "@homarr/validation/common";
import { iconsDetectFaviconSchema } from "@homarr/validation/icons";

import { convertIntersectionToZodObject } from "../schema-merger";
import {
  createTRPCRouter,
  isDemoMode,
  permissionRequiredProcedure,
  protectedProcedure,
  publicProcedure,
} from "../trpc";
import { AppAccessControl } from "./app/app-access-control";

const defaultIcon = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/homarr.svg";

export const appRouter = createTRPCRouter({
  getPaginated: permissionRequiredProcedure
    .requiresPermission("app-modify-all")
    .meta({
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
    })
    .input(paginatedSchema)
    .output(z.object({ items: z.array(selectAppSchema), totalCount: z.number() }))
    .query(async ({ input, ctx }) => {
      const whereQuery = input.search ? like(apps.name, `%${input.search.trim()}%`) : undefined;
      const totalCount = await ctx.db.$count(apps, whereQuery);

      const dbApps = await ctx.db.query.apps.findMany({
        limit: input.pageSize,
        offset: (input.page - 1) * input.pageSize,
        where: whereQuery,
        orderBy: asc(apps.name),
      });

      return {
        items: dbApps.map((app) => visibleApp(app, ctx.session.user)),
        totalCount,
      };
    }),
  all: permissionRequiredProcedure
    .requiresPermission("app-modify-all")
    .input(z.void())
    .output(z.array(selectAppSchema))
    .meta({
      openapi: {
        method: "GET",
        path: "/api/apps",
        tags: ["apps"],
        protect: true,
        summary: "List all apps",
        description: "Return all apps ordered by name. Requires app-modify-all permission.",
      },
      mcp: { enabled: true, description: "List all apps" },
    })
    .query(async ({ ctx }) => {
      const results = await ctx.db.query.apps.findMany({ orderBy: asc(apps.name) });
      return results.map((app) => visibleApp(app, ctx.session.user));
    }),
  search: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .output(z.array(selectAppSchema))
    .meta({
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
    })
    .query(async ({ ctx, input }) => {
      if (
        !ctx.session.user.permissions.includes("app-modify-all") &&
        !ctx.session.user.permissions.includes("board-modify-all")
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Permission denied",
        });
      }

      const results = await ctx.db.query.apps.findMany({
        where: like(apps.name, `%${input.query}%`),
        orderBy: asc(apps.name),
        limit: input.limit,
      });
      return results.map((app) => visibleApp(app, ctx.session.user));
    }),
  selectable: protectedProcedure
    .input(z.void())
    .output(
      z.array(
        selectAppSchema.pick({
          id: true,
          name: true,
          iconUrl: true,
          href: true,
          pingUrl: true,
          description: true,
        }),
      ),
    )
    .meta({
      openapi: {
        method: "GET",
        path: "/api/apps/selectable",
        tags: ["apps"],
        protect: true,
        summary: "List selectable apps",
        description:
          "Return app IDs, names, icons, descriptions, destination URLs, and ping URLs for selection controls. Requires authentication.",
      },
    })
    .query(({ ctx }) => {
      return ctx.db.query.apps.findMany({
        columns: {
          id: true,
          name: true,
          iconUrl: true,
          description: true,
          href: true,
          pingUrl: true,
        },
        orderBy: asc(apps.name),
      });
    }),
  byId: publicProcedure
    .input(byIdSchema)
    .output(selectAppSchema)
    .meta({
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
    })
    .query(async ({ ctx, input }) => {
      const repository = new AppRepository(ctx.db, ctx.session?.user ?? null);
      const app = await repository.getByIdAsync(input.id);

      if (!app) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "App not found",
        });
      }

      return app;
    }),
  byIds: publicProcedure.input(z.array(z.string())).query(async ({ ctx, input }) => {
    const repository = new AppRepository(ctx.db, ctx.session?.user ?? null);
    return await repository.getByIdsAsync(input);
  }),
  create: permissionRequiredProcedure
    .requiresPermission("app-create")
    .input(appManageSchema)
    .output(z.object({ appId: z.string() }).and(selectAppSchema))
    .meta({
      openapi: {
        method: "POST",
        path: "/api/apps",
        tags: ["apps"],
        protect: true,
        summary: "Create an app",
        description:
          "Create an app bookmark. Requires app-create permission. Returns the app, including its ID and the legacy appId field. An empty pingUrl disables the custom ping URL. An optional dockerContainer link requires admin permission; use a name@endpointId pair from docker_getContainers.",
      },
      mcp: {
        enabled: true,
        effect: "additive",
        description:
          "Create a new app (bookmark/shortcut to a service). REQUIRED: name (string), iconUrl (icon URL string), href (app URL or custom URI scheme such as vscode://, or blank). OPTIONAL: description (string or null), pingUrl (URL to check reachability, or empty string), dockerContainer (name@endpointId from docker_getContainers; admin permission required)",
      },
    })
    .mutation(async ({ ctx, input }) => {
      const id = createId();
      if (input.dockerContainer) await validateAppDockerContainerAsync(input.dockerContainer, ctx.session.user);
      const insertValues = {
        id,
        dockerContainer: input.dockerContainer ?? null,
        name: input.name,
        description: input.description,
        iconUrl: input.iconUrl,
        href: input.href,
        pingUrl: input.pingUrl === "" ? null : input.pingUrl,
      };
      await ctx.db.insert(apps).values(insertValues);

      // TODO: breaking change necessary for removing appId property
      return { appId: id, ...insertValues };
    }),
  // A mutation, so the website url travels in the request body and stays out of access logs.
  detectMetadata: permissionRequiredProcedure
    .requiresPermission("app-create")
    .input(iconsDetectFaviconSchema)
    .output(z.object({ name: z.string(), iconUrl: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const metadata = env.NO_EXTERNAL_CONNECTION
        ? { title: null, iconUrl: null }
        : await fetchWebsiteMetadataAsync(input.href);
      const name = (metadata.title ?? new URL(input.href).hostname).slice(0, 64);
      return {
        name,
        // A curated icon is served by Homarr's icon repositories, so it loads even where the site's own favicon is blocked
        iconUrl: (await getIconForWebsiteAsync(ctx.db, input.href, metadata.title)) ?? metadata.iconUrl ?? defaultIcon,
      };
    }),
  createMany: permissionRequiredProcedure
    .requiresPermission("app-create")
    .input(appCreateManySchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.map(async (app) => {
          if (app.dockerContainer) await validateAppDockerContainerAsync(app.dockerContainer, ctx.session.user);
        }),
      );
      await ctx.db.insert(apps).values(
        input.map((app) => ({
          id: createId(),
          name: app.name,
          dockerContainer: app.dockerContainer ?? null,
          pingUrl: app.pingUrl || null,
          description: app.description,
          iconUrl: app.iconUrl ?? getIconForName(ctx.db, app.name).sync()?.url ?? defaultIcon,
          href: app.href,
        })),
      );
    }),
  update: permissionRequiredProcedure
    .requiresPermission("app-modify-all")
    .input(convertIntersectionToZodObject(appEditSchema))
    .output(z.void())
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/apps/{id}",
        tags: ["apps"],
        protect: true,
        summary: "Update an app",
        description:
          "Update an app by ID. Requires app-modify-all permission. Supply all required app fields; an empty pingUrl clears the custom ping URL. Changing href invalidates linked integration caches. Omit dockerContainer to preserve its link; an admin can pass null to unlink or name@endpointId from Docker inventory to link.",
      },
      mcp: {
        enabled: true,
        description:
          "Update an existing app. REQUIRED: id (app ID), name, iconUrl, href. OPTIONAL: description (string or null), pingUrl (URL or empty string), dockerContainer (admin-only name@endpointId link, null to unlink; omitted preserves it)",
      },
    })
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.db.query.apps.findFirst({
        where: eq(apps.id, input.id),
      });

      if (!app) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "App not found",
        });
      }

      if (input.dockerContainer !== undefined && input.dockerContainer !== app.dockerContainer) {
        await validateAppDockerContainerAsync(input.dockerContainer, ctx.session.user);
      }

      await ctx.db
        .update(apps)
        .set({
          name: input.name,
          dockerContainer: input.dockerContainer,
          description: input.description,
          iconUrl: input.iconUrl,
          href: input.href,
          pingUrl: input.pingUrl === "" ? null : input.pingUrl,
        })
        .where(eq(apps.id, input.id));

      if (app.href !== input.href) {
        const linkedIntegrations = await ctx.db.query.integrations.findMany({
          columns: { id: true },
          where: eq(integrations.appId, input.id),
        });
        await Promise.all(linkedIntegrations.map(({ id }) => invalidateIntegrationResponseCacheAsync(id)));
      }
    }),
  delete: permissionRequiredProcedure
    .requiresPermission("app-full-all")
    .output(z.void())
    .meta({
      openapi: {
        method: "DELETE",
        path: "/api/apps/{id}",
        tags: ["apps"],
        protect: true,
        summary: "Delete an app",
        description: "Delete an app by ID and invalidate linked integration caches. Requires app-full-all permission.",
      },
      mcp: { enabled: true, effect: "destructive", description: "Delete an app by ID. REQUIRED: id (app ID string)" },
    })
    .input(byIdSchema)
    .mutation(async ({ ctx, input }) => {
      const linkedIntegrations = await ctx.db.query.integrations.findMany({
        columns: { id: true },
        where: eq(integrations.appId, input.id),
      });
      await ctx.db.delete(apps).where(eq(apps.id, input.id));
      await Promise.all(linkedIntegrations.map(({ id }) => invalidateIntegrationResponseCacheAsync(id)));
    }),
});

type App = InferSelectModel<typeof apps>;

export class AppRepository {
  private readonly accessControl: AppAccessControl;

  constructor(
    private db: Database,
    private user: Session["user"] | null,
  ) {
    this.accessControl = new AppAccessControl(db, user);
  }

  public async getByIdAsync(id: string): Promise<App | null> {
    const apps = await this.getByIdsAsync([id]);
    return apps[0] ?? null;
  }

  public async getByIdsAsync(ids: string[]): Promise<App[]> {
    const canUserSeeApps = await this.accessControl.canUserSeeAppsAsync(ids);
    const dbApps = await this.db.query.apps.findMany({
      where: inArray(apps.id, ids),
    });

    return canUserSeeApps ? dbApps.map((app) => visibleApp(app, this.user)) : [];
  }
}

// Linking changes which container the App tile controls; ordinary app-edit permission is not Docker access.
const validateAppDockerContainerAsync = async (value: string | null, user: Session["user"]) => {
  if (!user.permissions.includes("admin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Docker container linking requires admin permission" });
  }
  if (value === null) return;
  if (!dockerEnv.ENABLE_DOCKER && !isDemoMode) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Docker route is not available" });
  }
  const link = parseLinkedDockerContainer(value);
  const { data } = await dockerContainersRequestHandler.handler({}).getDataAsync();
  const exists =
    link && data.containers.some(({ endpointId, name }) => endpointId === link.endpointId && name === link.name);
  if (!exists) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Docker container was not found on the selected endpoint" });
  }
};

const visibleApp = (app: App, user: Session["user"] | null): App => {
  if (user?.permissions.includes("admin")) return app;
  return { ...app, dockerContainer: null };
};
