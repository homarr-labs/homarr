import { TRPCError } from "@trpc/server";

import type { InferInsertModel } from "@homarr/db";
import { and, createId, desc, eq, like } from "@homarr/db";
import { iconRepositories, icons, medias } from "@homarr/db/schema";
import { createLocalImageUrl, LOCAL_ICON_REPOSITORY_SLUG, mapMediaToIcon } from "@homarr/icons/local";
import { validation, z } from "@homarr/validation";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure } from "../../trpc";

export const mediaRouter = createTRPCRouter({
  getPaginated: protectedProcedure
    .input(
      validation.common.paginated.and(
        z.object({ includeFromAllUsers: z.boolean().default(false), search: z.string().trim().default("") }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const includeFromAllUsers = ctx.session.user.permissions.includes("media-view-all") && input.includeFromAllUsers;

      const where = and(
        input.search.length >= 1 ? like(medias.name, `%${input.search}%`) : undefined,
        includeFromAllUsers ? undefined : eq(medias.creatorId, ctx.session.user.id),
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
  uploadMedia: permissionRequiredProcedure
    .requiresPermission("media-upload")
    .input(validation.media.uploadMedia)
    .mutation(async ({ ctx, input }) => {
      const content = Buffer.from(await input.file.arrayBuffer());
      const id = createId();
      const media = {
        id,
        creatorId: ctx.session.user.id,
        content,
        size: input.file.size,
        contentType: input.file.type,
        name: input.file.name,
      } satisfies InferInsertModel<typeof medias>;
      await ctx.db.insert(medias).values(media);

      const localIconRepository = await ctx.db.query.iconRepositories.findFirst({
        where: eq(iconRepositories.slug, LOCAL_ICON_REPOSITORY_SLUG),
      });

      if (!localIconRepository) return id;

      const icon = mapMediaToIcon(media);
      await ctx.db.insert(icons).values({
        id: createId(),
        checksum: icon.checksum,
        name: icon.fileNameWithExtension,
        url: icon.imageUrl,
        iconRepositoryId: localIconRepository.id,
      });

      return id;
    }),
  deleteMedia: protectedProcedure.input(validation.common.byId).mutation(async ({ ctx, input }) => {
    const dbMedia = await ctx.db.query.medias.findFirst({
      where: eq(medias.id, input.id),
      columns: {
        id: true,
        creatorId: true,
      },
    });

    if (!dbMedia) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Media not found",
      });
    }

    // Only allow users with media-full-all permission and the creator of the media to delete it
    if (!ctx.session.user.permissions.includes("media-full-all") && ctx.session.user.id !== dbMedia.creatorId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to delete this media",
      });
    }

    await ctx.db.delete(medias).where(eq(medias.id, input.id));
    await ctx.db.delete(icons).where(eq(icons.url, createLocalImageUrl(input.id)));
  }),
});
