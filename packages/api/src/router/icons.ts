import { count, like } from "@homarr/db";
import { icons } from "@homarr/db/schema/sqlite";
import { validation } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const iconsRouter = createTRPCRouter({
  findIcons: publicProcedure.input(validation.icons.findIcons).query(async ({ ctx, input }) => {
    return {
      icons: await ctx.db.query.iconRepositories.findMany({
        with: {
          icons: {
            columns: {
              id: true,
              name: true,
              url: true,
            },
            where: (input.searchText?.length ?? 0) > 0 ? like(icons.name, `%${input.searchText}%`) : undefined,
            limit: input.limitPerGroup,
          },
        },
      }),
      countIcons: (await ctx.db.select({ count: count() }).from(icons))[0]?.count ?? 0,
    };
  }),
});
