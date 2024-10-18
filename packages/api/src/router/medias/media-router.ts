import { createId, desc, eq } from "@homarr/db";
import { medias } from "@homarr/db/schema/sqlite";
import { validation, z } from "@homarr/validation";

import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const mediaRouter = createTRPCRouter({
  getMedias: protectedProcedure
    .input(validation.common.paginated.and(z.object({ all: z.boolean() })))
    .query(async ({ ctx, input }) => {
      const includeAll = ctx.session.user.permissions.includes("admin") && input.all;

      const dbMedias = await ctx.db.query.medias.findMany({
        where: includeAll ? undefined : eq(medias.creatorId, ctx.session.user.id),
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

      return dbMedias;
    }),
  uploadMedia: protectedProcedure.input(validation.media.uploadMedia).mutation(async ({ ctx, input }) => {
    const content = Buffer.from(await input.file.arrayBuffer());
    const id = createId();
    await ctx.db.insert(medias).values({
      id,
      creatorId: ctx.session.user.id,
      content,
      contentType: input.file.type,
      name: input.file.name,
    });

    return id;
  }),
});
