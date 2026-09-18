import { z } from "zod/v4";

import type { StatsProvider } from "../types";

const mealieStatsResponseSchema = z
  .object({
    totalRecipes: z.number().finite().int().nonnegative(),
    totalUsers: z.number().finite().int().nonnegative(),
    totalCategories: z.number().finite().int().nonnegative(),
    totalTags: z.number().finite().int().nonnegative(),
  })
  .passthrough();

export const mealieStatsProvider = {
  metrics: [
    { key: "recipes", label: "Recipes", unit: "count" },
    { key: "users", label: "Users", unit: "count" },
    { key: "categories", label: "Categories", unit: "count" },
    { key: "tags", label: "Tags", unit: "count" },
  ],

  async fetchAsync(context) {
    const response = await context.requestAsync("/api/households/statistics", {
      headers: { Authorization: `Bearer ${context.secret("apiKey")}` },
      signal: context.signal,
    });
    const stats = mealieStatsResponseSchema.parse(response);

    return {
      recipes: stats.totalRecipes,
      users: stats.totalUsers,
      categories: stats.totalCategories,
      tags: stats.totalTags,
    };
  },
} satisfies StatsProvider;
