import { and, like } from "@homarr/db";
import { icons } from "@homarr/db/schema";
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
            where:
              (input.searchText?.length ?? 0) > 0
                ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  and(...input.searchText!.split(" ").map((keyword) => like(icons.name, `%${keyword}%`)))
                : undefined,
            limit: input.limitPerGroup,
          },
        },
      }),
      countIcons: await ctx.db.$count(icons),
    };
  }),
});
