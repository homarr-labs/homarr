import { z } from "zod/v4";

import { fetchStatsGroupsAsync } from "../types";
import type { StatsAuthenticationContext, StatsProvider } from "../types";

const count = z.number().int().nonnegative();
const space = z.object({ user_count: count, recipe_count: count });
const spaces = z.union([z.array(space), z.object({ results: z.array(space) })]);

const getHttpAuthentication = (context: StatsAuthenticationContext) => ({
  headers: { Authorization: `Bearer ${context.secret("apiKey")}` },
});

export const tandoorStatsProvider = {
  getHttpAuthentication,
  metrics: [
    { key: "users", label: "Users in first space", unit: "count" },
    { key: "recipes", label: "Recipes in first space", unit: "count" },
    { key: "keywords", label: "Keywords", unit: "count" },
  ],
  async fetchAsync(context) {
    const headers = getHttpAuthentication(context).headers;
    return await fetchStatsGroupsAsync([
      {
        metrics: ["users", "recipes"],
        fetchAsync: async () => {
          const parsed = spaces.parse(await context.requestAsync("/api/space/", { headers, signal: context.signal }));
          let first: z.infer<typeof space> | undefined;
          if (Array.isArray(parsed)) first = parsed[0];
          else first = parsed.results[0];
          return { users: first?.user_count ?? null, recipes: first?.recipe_count ?? null };
        },
      },
      {
        metrics: ["keywords"],
        fetchAsync: async () => ({
          keywords: z
            .object({ count })
            .parse(await context.requestAsync("/api/keyword/?page=1&page_size=1", { headers, signal: context.signal }))
            .count,
        }),
      },
    ]);
  },
} satisfies StatsProvider;
