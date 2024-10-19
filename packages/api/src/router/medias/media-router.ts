import { TRPCError } from "@trpc/server";

import { and, createId, desc, eq, like } from "@homarr/db";
import { medias } from "@homarr/db/schema/sqlite";
import { validation, z } from "@homarr/validation";

import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const mediaRouter = createTRPCRouter({
  getPaginated: protectedProcedure
    .input(
      validation.common.paginated.and(
        z.object({ showAll: z.boolean().default(false), search: z.string().trim().default("") }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const includeAll = ctx.session.user.permissions.includes("admin") && input.showAll;

      const where = and(
        input.search.length >= 1 ? like(medias.name, `%${input.search}%`) : undefined,
        includeAll ? undefined : eq(medias.creatorId, ctx.session.user.id),
      );
      const dbMedias = await ctx.db.query.medias.findMany({
        where,
        orderBy: desc(medias.createdAt),
        limit: input.pageSize,
        offset: (input.page - 1) * input.pageSize,
        columns: {
          content: false,
        },
        with: {
          creator: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      const totalCount = await ctx.db.$count(medias, where);

      return {
        items: dbMedias,
        totalCount,
      };
    }),
  uploadMedia: protectedProcedure.input(validation.media.uploadMedia).mutation(async ({ ctx, input }) => {
    const content = Buffer.from(await input.file.arrayBuffer());
    const id = createId();
    await ctx.db.insert(medias).values({
      id,
      creatorId: ctx.session.user.id,
      content,
      size: input.file.size,
      contentType: input.file.type,
      name: input.file.name,
    });

    return id;
  }),
  deleteMedia: protectedProcedure.input(validation.common.byId).mutation(async ({ ctx, input }) => {
    const dbMedia = await ctx.db.query.medias.findFirst({
      where: eq(medias.id, input.id),
      columns: {
        creatorId: true,
      },
    });

    if (!dbMedia) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Media not found",
      });
    }

    // Only allow admins and the creator of the media to delete it
    if (!ctx.session.user.permissions.includes("admin") && ctx.session.user.id !== dbMedia.creatorId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to delete this media",
      });
    }

    await ctx.db.delete(medias).where(eq(medias.id, input.id));
  }),
});
