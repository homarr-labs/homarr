import { z } from "zod/v4";

import type { StatsProvider } from "../types";

const count = z.number().int().nonnegative();
const space = z.object({ user_count: count, recipe_count: count });
const spaces = z.union([z.array(space), z.object({ results: z.array(space) })]);

export const tandoorStatsProvider = {
  metrics: [
    { key: "users", label: "Users in first space", unit: "count" },
    { key: "recipes", label: "Recipes in first space", unit: "count" },
    { key: "keywords", label: "Keywords", unit: "count" },
  ],
  async fetchAsync(context) {
    const headers = { Authorization: `Bearer ${context.secret("apiKey")}` };
    const [spaceResponse, keywordResponse] = await Promise.all([
      context.requestAsync("/api/space/", { headers }),
      context.requestAsync("/api/keyword/?page=1&page_size=1", { headers }),
    ]);
    const parsed = spaces.parse(spaceResponse);
    let first: z.infer<typeof space> | undefined;
    if (Array.isArray(parsed)) first = parsed[0];
    else first = parsed.results[0];
    return {
      users: first?.user_count ?? null,
      recipes: first?.recipe_count ?? null,
      keywords: z.object({ count }).parse(keywordResponse).count,
    };
  },
} satisfies StatsProvider;
