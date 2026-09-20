import { z } from "zod";

import type { StatsProvider } from "../types";

const countSchema = z.number().finite().nonnegative().int();

const groupStatsResponseSchema = z
  .object({
    totalItems: countSchema,
    totalLocations: countSchema,
    totalLabels: countSchema.optional(),
    totalTags: countSchema.optional(),
    totalWithWarranty: countSchema,
    totalItemPrice: z.number().finite().nonnegative(),
    totalUsers: countSchema,
  })
  .passthrough()
  .refine((stats) => stats.totalLabels !== undefined || stats.totalTags !== undefined, {
    message: "Expected a labels or tags count",
  });

export const homeboxStatsProvider = {
  metrics: [
    { key: "items", label: "Items", unit: "count" },
    { key: "locations", label: "Locations", unit: "count" },
    { key: "labels", label: "Labels", unit: "count" },
    { key: "itemsWithWarranty", label: "Items with warranty", unit: "count" },
    { key: "totalValue", label: "Total value", unit: "text" },
    { key: "users", label: "Users", unit: "count" },
  ],

  async fetchAsync(context) {
    const loginResponse = await context.requestAsync("/api/v1/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username: context.secret("username"),
        password: context.secret("password"),
      }).toString(),
      signal: context.signal,
    });
    const login = z
      .object({ token: z.string().min(1) })
      .passthrough()
      .parse(loginResponse);
    const token = login.token;
    const headers = { Authorization: token };

    const response = await context.requestAsync("/api/v1/groups/statistics", {
      headers,
      signal: context.signal,
    });
    const stats = groupStatsResponseSchema.parse(response);
    const group = z
      .object({ currency: z.string().min(1) })
      .parse(await context.requestAsync("/api/v1/groups", { headers, signal: context.signal }));

    return {
      items: stats.totalItems,
      locations: stats.totalLocations,
      labels: stats.totalLabels ?? stats.totalTags ?? 0,
      itemsWithWarranty: stats.totalWithWarranty,
      totalValue: `${group.currency} ${stats.totalItemPrice}`,
      users: stats.totalUsers,
    };
  },
} satisfies StatsProvider;
