import { z } from "zod";

import type { StatsProvider } from "../types";

const countSchema = z.number().finite().int().nonnegative();

const taskListSchema = z.object({
  data: z.array(z.object({ priority: z.string() }).passthrough()),
});

const shoppingListsSchema = z.object({
  data: z.array(
    z
      .object({
        item_total: countSchema,
        item_checked: countSchema.nullable(),
      })
      .passthrough(),
  ),
});

const highPriorities = new Set(["high", "urgent"]);

export const yuvomiStatsProvider = {
  metrics: [
    { key: "openTasks", label: "Open tasks", unit: "count" },
    { key: "highPriorityTasks", label: "High priority tasks", unit: "count" },
    { key: "shoppingItems", label: "Items to buy", unit: "count" },
  ],
  async fetchAsync(context) {
    // Top-level tasks that are not done and not archived, as the token's user sees them.
    const [tasksResponse, shoppingResponse] = await Promise.all([
      context.requestAsync("/api/v1/tasks?status=open&status=in_progress", { signal: context.signal }),
      context.requestAsync("/api/v1/shopping", { signal: context.signal }),
    ]);
    const tasks = taskListSchema.parse(tasksResponse).data;
    const shoppingLists = shoppingListsSchema.parse(shoppingResponse).data;

    return {
      openTasks: tasks.length,
      highPriorityTasks: tasks.filter((task) => highPriorities.has(task.priority)).length,
      shoppingItems: shoppingLists.reduce(
        (total, list) => total + Math.max(list.item_total - (list.item_checked ?? 0), 0),
        0,
      ),
    };
  },
} satisfies StatsProvider;
