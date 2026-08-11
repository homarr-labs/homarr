import { getImageMatchRank, normalizeImageName } from "@homarr/common";
import { icons } from "@homarr/db/schema";
import { iconsFindSchema } from "@homarr/validation/icons";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const iconsRouter = createTRPCRouter({
  findIcons: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Search for icons by name across all icon repositories. OPTIONAL: searchText (string to filter), limitPerGroup (number 1-500, default 12). Call with no arguments to browse all icons",
      },
    })
    .input(iconsFindSchema)
    .query(async ({ ctx, input }) => {
      const term = normalizeImageName(input.searchText ?? "");
      const repositories = await ctx.db.query.iconRepositories.findMany({
        orderBy: (table, { asc, sql }) => [sql`CASE WHEN ${table.slug} = 'local' THEN 0 ELSE 1 END`, asc(table.slug)],
        with: {
          icons: {
            columns: { id: true, name: true, url: true },
            orderBy: (table, { asc, sql }) => [
              sql`CASE WHEN ${table.name} LIKE '%.svg' THEN 0 ELSE 1 END`,
              asc(table.name),
            ],
            limit: term.length === 0 ? input.limitPerGroup : undefined,
          },
        },
      });

      return {
        icons:
          term.length === 0
            ? repositories
            : repositories.map((repository) => ({
                ...repository,
                icons: repository.icons
                  .flatMap((icon) => {
                    const rank = getImageMatchRank(term, icon.name || icon.url);
                    return rank === null ? [] : [{ icon, rank }];
                  })
                  .toSorted((a, b) =>
                    a.rank !== b.rank
                      ? a.rank - b.rank
                      : Number(b.icon.name.toLowerCase().endsWith(".svg")) -
                          Number(a.icon.name.toLowerCase().endsWith(".svg")) || a.icon.name.localeCompare(b.icon.name),
                  )
                  .slice(0, input.limitPerGroup)
                  .map(({ icon }) => icon),
              })),
        countIcons: await ctx.db.$count(icons),
      };
    }),
});
