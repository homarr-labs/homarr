import { env } from "@homarr/common/env";
import { fetchFaviconUrlAsync, findIconsAsync } from "@homarr/icons";
import { iconsDetectFaviconSchema, iconsFindSchema } from "@homarr/validation/icons";

import { createTRPCRouter, permissionRequiredProcedure, publicProcedure } from "../trpc";

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
    .query(({ ctx, input }) => findIconsAsync(ctx.db, input.searchText ?? "", input.limitPerGroup)),
  detectFavicon: permissionRequiredProcedure
    .requiresPermission("app-create")
    .meta({
      readOnly: false,
      mcp: {
        enabled: true,
        description:
          'Detect the icon of a website by reading the <link rel="icon"> declarations of its page, falling back to /favicon.ico. REQUIRED: href (http or https URL of the website). Returns { url: string | null }, null when no icon was found',
      },
    })
    .input(iconsDetectFaviconSchema)
    .query(async ({ input }) => {
      if (env.NO_EXTERNAL_CONNECTION) return { url: null };

      return { url: await fetchFaviconUrlAsync(input.href) };
    }),
});
