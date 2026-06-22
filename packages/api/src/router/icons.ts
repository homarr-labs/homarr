import { and, like } from "@homarr/db";
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
      const term = input.searchText?.toLowerCase().trim() ?? "";
      const keywords = (input.searchText ?? "").split(" ").filter((keyword) => keyword.length > 0);

      let whereCondition = undefined;
      if (term.length > 0) {
        whereCondition = and(...keywords.map((keyword) => like(icons.name, `%${keyword}%`)));
      }

      return {
        icons: await ctx.db.query.iconRepositories.findMany({
          with: {
            icons: {
              columns: { id: true, name: true, url: true },
              where: whereCondition,
              orderBy: (table, { asc, sql }) => {
                // ponytail: SVG first, then alphabetical; with a search term,
                // prepend a relevance tier (exact > prefix > substring).
                const svgFirst = sql`CASE WHEN ${table.name} LIKE '%.svg' THEN 0 ELSE 1 END`;
                const nameAsc = asc(table.name);
                if (term.length === 0) {
                  return [svgFirst, nameAsc];
                }
                const tier = sql`CASE
                  WHEN LOWER(${table.name}) = ${term} THEN 0
                  WHEN LOWER(${table.name}) LIKE ${term + "%"} THEN 1
                  WHEN LOWER(${table.name}) LIKE ${`%${term}%`} THEN 2
                  ELSE 3
                END`;
                return [tier, svgFirst, nameAsc];
              },
              limit: input.limitPerGroup,
            },
          },
        }),
        countIcons: await ctx.db.$count(icons),
      };
    }),
});
