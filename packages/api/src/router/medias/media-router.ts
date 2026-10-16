import { ApiError } from "../../procedure";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import type { InferInsertModel } from "@homarr/db";
import { and, desc, eq, like } from "@homarr/db";
import { iconRepositories, icons, medias } from "@homarr/db/schema";
import { mapMediaToIcon } from "@homarr/icons";
import { createLocalImageUrl, LOCAL_ICON_REPOSITORY_SLUG } from "@homarr/icons/local";
import { byIdSchema, paginatedSchema } from "@homarr/validation/common";
import { mediaUploadSchema } from "@homarr/validation/media";

import { createApiRouter, permissionRequiredProcedure, protectedProcedure } from "../../procedure";

export const mediaRouter = createApiRouter({
  getPaginated: protectedProcedure
    .input(
      paginatedSchema.and(
        z.object({ includeFromAllUsers: z.boolean().default(false), search: z.string().trim().default("") }),
      ),
    )
    .query(async ({ context, input }) => {
      const includeFromAllUsers =
        context.session.user.permissions.includes("media-view-all") && input.includeFromAllUsers;

      const where = and(
        input.search.length >= 1 ? like(medias.name, `%${input.search}%`) : undefined,
        includeFromAllUsers ? undefined : eq(medias.creatorId, context.session.user.id),
      );
      const dbMedias = await context.db.query.medias.findMany({
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
              email: true,
            },
          },
        },
      });

      const totalCount = await context.db.$count(medias, where);

      return {
        items: dbMedias,
        totalCount,
      };
    }),
  uploadMedia: permissionRequiredProcedure
    .requiresPermission("media-upload")
    .input(mediaUploadSchema)
    .mutation(async ({ context, input }) => {
      const files = await Promise.all(
        input.files.map(async (file) => ({
          id: createId(),
          meta: file,
          content: Buffer.from(await file.arrayBuffer()),
        })),
      );
      const insertMedias = files.map(
        (file): InferInsertModel<typeof medias> => ({
          id: file.id,
          creatorId: context.session.user.id,
          content: file.content,
          size: file.meta.size,
          contentType: file.meta.type,
          name: file.meta.name,
        }),
      );
      await context.db.insert(medias).values(insertMedias);

      const localIconRepository = await context.db.query.iconRepositories.findFirst({
        where: eq(iconRepositories.slug, LOCAL_ICON_REPOSITORY_SLUG),
      });

      const ids = files.map((file) => file.id);
      if (!localIconRepository) return ids;

      await context.db.insert(icons).values(
        insertMedias.map((media) => {
          const icon = mapMediaToIcon(media);

          return {
            id: createId(),
            checksum: icon.checksum,
            name: icon.fileNameWithExtension,
            url: icon.imageUrl,
            iconRepositoryId: localIconRepository.id,
          };
        }),
      );

      return ids;
    }),
  deleteMedia: protectedProcedure.input(byIdSchema).mutation(async ({ context, input }) => {
    const dbMedia = await context.db.query.medias.findFirst({
      where: eq(medias.id, input.id),
      columns: {
        id: true,
        creatorId: true,
      },
    });

    if (!dbMedia) {
      throw new ApiError({
        code: "NOT_FOUND",
        message: "Media not found",
      });
    }

    // Only allow users with media-full-all permission and the creator of the media to delete it
    if (!context.session.user.permissions.includes("media-full-all") && context.session.user.id !== dbMedia.creatorId) {
      throw new ApiError({
        code: "FORBIDDEN",
        message: "You don't have permission to delete this media",
      });
    }

    await context.db.delete(medias).where(eq(medias.id, input.id));
    await context.db.delete(icons).where(eq(icons.url, createLocalImageUrl(input.id)));
  }),
});
