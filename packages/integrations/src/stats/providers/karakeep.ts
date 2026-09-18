import { z } from "zod";

import type { StatsProvider } from "../types";

const karakeepStatsResponseSchema = z
  .object({
    numBookmarks: z.number().finite().nonnegative(),
    numFavorites: z.number().finite().nonnegative(),
    numArchived: z.number().finite().nonnegative(),
    numHighlights: z.number().finite().nonnegative(),
    numLists: z.number().finite().nonnegative(),
    numTags: z.number().finite().nonnegative(),
  })
  .passthrough();

export const karakeepStatsProvider = {
  metrics: [
    { key: "bookmarks", label: "Bookmarks", unit: "count" },
    { key: "favorites", label: "Favorites", unit: "count" },
    { key: "archived", label: "Archived", unit: "count" },
    { key: "highlights", label: "Highlights", unit: "count" },
    { key: "lists", label: "Lists", unit: "count" },
    { key: "tags", label: "Tags", unit: "count" },
  ],

  async fetchAsync(context) {
    const apiKey = context.secret("apiKey");
    const response = await context.requestAsync("/api/v1/users/me/stats", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: context.signal,
    });
    const stats = karakeepStatsResponseSchema.parse(response);

    return {
      bookmarks: stats.numBookmarks,
      favorites: stats.numFavorites,
      archived: stats.numArchived,
      highlights: stats.numHighlights,
      lists: stats.numLists,
      tags: stats.numTags,
    };
  },
} satisfies StatsProvider;
