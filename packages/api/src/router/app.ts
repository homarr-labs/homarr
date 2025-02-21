import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { asc, createId, eq, inArray, like } from "@homarr/db";
import { apps } from "@homarr/db/schema";
import { selectAppSchema } from "@homarr/db/validationSchemas";
import { getIconForName } from "@homarr/icons";
import { validation } from "@homarr/validation";

import { convertIntersectionToZodObject } from "../schema-merger";
import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { canUserSeeAppAsync } from "./app/app-access-control";

const defaultIcon = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/homarr.svg";

export const appRouter = createTRPCRouter({
  getPaginated: protectedProcedure
    .input(validation.common.paginated)
    .output(z.object({ items: z.array(selectAppSchema), totalCount: z.number() }))
    .meta({ openapi: { method: "GET", path: "/api/apps/paginated", tags: ["apps"], protect: true } })
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
        items: dbApps,
        totalCount,
      };
    }),
  all: protectedProcedure
    .input(z.void())
    .output(z.array(selectAppSchema))
    .meta({ openapi: { method: "GET", path: "/api/apps", tags: ["apps"], protect: true } })
    .query(({ ctx }) => {
      return ctx.db.query.apps.findMany({
        orderBy: asc(apps.name),
      });
    }),
  search: protectedProcedure
    .input(z.object({ query: z.string(), limit: z.number().min(1).max(100).default(10) }))
    .output(z.array(selectAppSchema))
    .meta({ openapi: { method: "GET", path: "/api/apps/search", tags: ["apps"], protect: true } })
    .query(({ ctx, input }) => {
      return ctx.db.query.apps.findMany({
        where: like(apps.name, `%${input.query}%`),
        orderBy: asc(apps.name),
        limit: input.limit,
      });
    }),
  selectable: protectedProcedure
    .input(z.void())
    .output(z.array(selectAppSchema.pick({ id: true, name: true, iconUrl: true, href: true, description: true })))
    .meta({
      openapi: {
        method: "GET",
        path: "/api/apps/selectable",
        tags: ["apps"],
        protect: true,
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
        },
        orderBy: asc(apps.name),
      });
    }),
  byId: publicProcedure
    .input(validation.common.byId)
    .output(selectAppSchema)
    .meta({ openapi: { method: "GET", path: "/api/apps/{id}", tags: ["apps"], protect: true } })
    .query(async ({ ctx, input }) => {
      const app = await ctx.db.query.apps.findFirst({
        where: eq(apps.id, input.id),
      });

      if (!app) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "App not found",
        });
      }

      const canUserSeeApp = await canUserSeeAppAsync(ctx.session?.user ?? null, app.id);
      if (!canUserSeeApp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "App not found",
        });
      }

      return app;
    }),
  byIds: publicProcedure.input(z.array(z.string())).query(async ({ ctx, input }) => {
    return await ctx.db.query.apps.findMany({
      where: inArray(apps.id, input),
    });
  }),
  create: permissionRequiredProcedure
    .requiresPermission("app-create")
    .input(validation.app.manage)
    .output(z.object({ appId: z.string() }))
    .meta({ openapi: { method: "POST", path: "/api/apps", tags: ["apps"], protect: true } })
    .mutation(async ({ ctx, input }) => {
      const id = createId();
      await ctx.db.insert(apps).values({
        id,
        name: input.name,
        description: input.description,
        iconUrl: input.iconUrl,
        href: input.href,
      });

      return { appId: id };
    }),
  createMany: permissionRequiredProcedure
    .requiresPermission("app-create")
    .input(validation.app.createMany)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(apps).values(
        input.map((app) => ({
          id: createId(),
          name: app.name,
          description: app.description,
          iconUrl: app.iconUrl ?? getIconForName(ctx.db, app.name).sync()?.url ?? defaultIcon,
          href: app.href,
        })),
      );
    }),
  update: permissionRequiredProcedure
    .requiresPermission("app-modify-all")
    .input(convertIntersectionToZodObject(validation.app.edit))
    .output(z.void())
    .meta({ openapi: { method: "PATCH", path: "/api/apps/{id}", tags: ["apps"], protect: true } })
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

      await ctx.db
        .update(apps)
        .set({
          name: input.name,
          description: input.description,
          iconUrl: input.iconUrl,
          href: input.href,
        })
        .where(eq(apps.id, input.id));
    }),
  delete: permissionRequiredProcedure
    .requiresPermission("app-full-all")
    .output(z.void())
    .meta({ openapi: { method: "DELETE", path: "/api/apps/{id}", tags: ["apps"], protect: true } })
    .input(validation.common.byId)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(apps).where(eq(apps.id, input.id));
    }),
});
