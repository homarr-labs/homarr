import { getImageMatchRank, normalizeImageName } from "@homarr/common";
import { and, isNull, like, or } from "@homarr/db";
import { icons } from "@homarr/db/schema";
import { iconsFindSchema } from "@homarr/validation/icons";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const iconsRouter = createTRPCRouter({
  findIcons: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Search for icons by name across all icon repositories. Returns matching icon names and exact image URLs; use those URLs directly for app icons and Markdown image previews. OPTIONAL: searchText (string to filter), limitPerGroup (number 1-500, default 12). Call with no arguments to browse all icons",
      },
    })
    .input(iconsFindSchema)
    .query(async ({ ctx, input }) => {
      const term = normalizeImageName(input.searchText ?? "");
      // `getImageMatchRank` only accepts an icon when every token of the normalized
      // search is part of its compacted name, so this pre-filter is a superset of
      // the icons the ranking below can accept. See packages/common/src/string.ts.
      const candidateFilter = createCandidateFilter(term);

      const [repositories, countIcons] = await Promise.all([
        ctx.db.query.iconRepositories.findMany({
          orderBy: (table, { asc, sql }) => [sql`CASE WHEN ${table.slug} = 'local' THEN 0 ELSE 1 END`, asc(table.slug)],
          with: {
            icons: {
              columns: { id: true, name: true, url: true },
              orderBy: (table, { asc, sql }) => [
                sql`CASE WHEN ${table.name} LIKE '%.svg' THEN 0 ELSE 1 END`,
                asc(table.name),
              ],
              where: candidateFilter,
              limit: term.length === 0 ? input.limitPerGroup : undefined,
            },
          },
        }),
        ctx.db.$count(icons),
      ]);

      const matchedRepositories = repositories.map((repository) => ({
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
      }));

      return {
        icons:
          term.length === 0 ? repositories : matchedRepositories.filter((repository) => repository.icons.length > 0),
        countIcons,
      };
    }),
});

/**
 * Narrows the icons a search has to look at, without ever dropping an icon the
 * ranking would have accepted.
 */
const createCandidateFilter = (term: string) => {
  if (term.length === 0) return undefined;

  // Tokens are normalized, so they can only contain letters, marks and digits.
  // Rows written before `searchName` existed are always candidates.
  const tokens = term.split(" ").filter((token) => token.length > 0);
  if (tokens.length === 0) return undefined;

  return or(isNull(icons.searchName), and(...tokens.map((token) => like(icons.searchName, `%${token}%`))));
};
