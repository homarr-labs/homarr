import { z } from "zod/v4";

import { searchDuckDuckGoBangsAsync } from "../../services/duckduckgo-bangs";
import { createApiRouter, publicProcedure } from "../../procedure";

export const bangsRouter = createApiRouter({
  search: publicProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ input }) => {
      return await searchDuckDuckGoBangsAsync({ query: input.query, limit: input.limit });
    }),
});
