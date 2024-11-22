import { TRPCError } from "@trpc/server";

import { asc, createId, eq, inArray, like } from "@homarr/db";
import { apps } from "@homarr/db/schema/sqlite";
import { validation, z } from "@homarr/validation";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { canUserSeeAppAsync } from "./app/app-access-control";

export const appRouter = createTRPCRouter({
  all: protectedProcedure
    .input(z.void())
    .output(
      z.array(
        z.object({
          name: z.string(),
          id: z.string(),
          description: z.string().nullable(),
          iconUrl: z.string(),
          href: z.string().nullable(),
        }),
      ),
    )
    .meta({ openapi: { method: "GET", path: "/api/apps", tags: ["apps"], protect: true } })
    .query(({ ctx }) => {
      return ctx.db.query.apps.findMany({
        orderBy: asc(apps.name),
      });
    }),
  search: protectedProcedure
    .input(z.object({ query: z.string(), limit: z.number().min(1).max(100).default(10) }))
    .output(
      z.array(
        z.object({
          name: z.string(),
          id: z.string(),
          description: z.string().nullable(),
          iconUrl: z.string(),
          href: z.string().nullable(),
        }),
      ),
    )
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
    .output(
      z.array(
        z.object({
          name: z.string(),
          id: z.string(),
          iconUrl: z.string(),
          description: z.string().nullable(),
          href: z.string().nullable(),
        }),
      ),
    )
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
    .output(
      z.object({
        name: z.string(),
        id: z.string(),
        description: z.string().nullable(),
        iconUrl: z.string(),
        href: z.string().nullable(),
      }),
    )
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
  byIds: protectedProcedure.input(z.array(z.string())).query(async ({ ctx, input }) => {
    return await ctx.db.query.apps.findMany({
      where: inArray(apps.id, input),
    });
  }),
  create: permissionRequiredProcedure
    .requiresPermission("app-create")
    .input(validation.app.manage)
    .output(z.void())
    .meta({ openapi: { method: "POST", path: "/api/apps", tags: ["apps"], protect: true } })
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(apps).values({
        id: createId(),
        name: input.name,
        description: input.description,
        iconUrl: input.iconUrl,
        href: input.href,
      });
    }),
  update: permissionRequiredProcedure
    .requiresPermission("app-modify-all")
    .input(validation.app.edit)
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
