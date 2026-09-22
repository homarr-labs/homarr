import { z } from "zod";

import { fetchStatsGroupsAsync } from "../types";
import type { StatsProvider } from "../types";

const countSchema = z.number().finite().int().nonnegative();

const workersResponseSchema = z
  .object({
    workers_status: z
      .array(
        z
          .object({
            idle: z.boolean(),
          })
          .passthrough(),
      )
      .min(0),
  })
  .passthrough();

const pendingResponseSchema = z
  .object({
    recordsTotal: countSchema,
  })
  .passthrough();

export const unmanicStatsProvider = {
  getHttpAuthentication: () => ({ headers: {} }),
  metrics: [
    { key: "activeWorkers", label: "Active workers", unit: "count" },
    { key: "totalWorkers", label: "Total workers", unit: "count" },
    { key: "recordsTotal", label: "Pending records", unit: "count" },
  ],
  async fetchAsync(context) {
    return await fetchStatsGroupsAsync([
      {
        metrics: ["activeWorkers", "totalWorkers"],
        fetchAsync: async () => {
          const response = await context.requestAsync("/unmanic/api/v2/workers/status", {
            method: "GET",
            signal: context.signal,
          });
          const workers = workersResponseSchema.parse(response).workers_status;
          return { activeWorkers: workers.filter((worker) => !worker.idle).length, totalWorkers: workers.length };
        },
      },
      {
        metrics: ["recordsTotal"],
        fetchAsync: async () => {
          const response = await context.requestAsync("/unmanic/api/v2/pending/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              start: 0,
              length: 0,
              search_value: "",
              status: "all",
              order_by: "priority",
              order_direction: "desc",
              library_ids: [],
            }),
            signal: context.signal,
          });
          return { recordsTotal: pendingResponseSchema.parse(response).recordsTotal };
        },
      },
    ]);
  },
} satisfies StatsProvider;
